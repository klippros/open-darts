import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { createDartThrow } from '@open-darts/game/dartScoring'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { describe, expect, it } from 'vitest'
import type { MatchObject } from '../src/match/MatchObject'
import {
  DeadlineKind,
  MatchCommandName,
  MatchEndingKind,
  MatchStatus,
  PlayMode,
} from '../src/match/types'
import {
  createMatchId,
  creatorUserId,
  markOpponentDisconnectedLongEnough,
  markOpponentDisconnectedRecently,
  markOpponentTurnStalled,
  otherUserId,
} from './helpers'

const checkoutDouble20 = () => [
  createDartThrow(
    { type: DartSegmentType.Number, value: 20 },
    DartMultiplier.Double,
    '2026-01-01T00:00:00.000Z',
  ),
]

const missVisit = () => [
  createDartThrow(
    { type: DartSegmentType.Number, value: 20 },
    DartMultiplier.Miss,
    '2026-01-01T00:00:00.000Z',
  ),
  createDartThrow(
    { type: DartSegmentType.Number, value: 20 },
    DartMultiplier.Miss,
    '2026-01-01T00:00:01.000Z',
  ),
  createDartThrow(
    { type: DartSegmentType.Number, value: 20 },
    DartMultiplier.Miss,
    '2026-01-01T00:00:02.000Z',
  ),
]

const toPublicDarts = (darts: ReturnType<typeof missVisit>) =>
  darts.map((dart) => ({
    segment:
      dart.segment.type === DartSegmentType.Number
        ? { type: 'number' as const, value: dart.segment.value }
        : { type: dart.segment.type },
    multiplier: dart.multiplier,
    points: dart.points,
    timestamp: dart.timestamp,
  }))

const startActiveMatch = async (): Promise<DurableObjectStub<MatchObject>> => {
  const matchId = createMatchId()
  const stub = env.MATCH.getByName(matchId)
  const created = await stub.init({
    matchId,
    inviteToken: crypto.randomUUID(),
    creatorUserId,
    mode: GameModeId.X01,
    config: { startScore: 40, doubleIn: false, doubleOut: true },
    legsToWin: 1,
    startingPlayerSlot: 0,
  })

  if (!created.ok) {
    throw new Error(created.message ?? 'init failed')
  }

  const inviteToken = created.state?.inviteToken

  if (inviteToken === undefined) {
    throw new Error('missing invite')
  }

  await stub.join({ userId: otherUserId, inviteToken })
  const began = await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

  if (!began.ok) {
    throw new Error(began.message ?? 'begin failed')
  }

  return stub
}

const startAsyncMatch = async (): Promise<DurableObjectStub<MatchObject>> => {
  const stub = await startActiveMatch()
  await markOpponentDisconnectedLongEnough(stub, otherUserId)
  const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })

  if (!started.ok) {
    throw new Error(started.message ?? 'start_async failed')
  }

  return stub
}

/** Forces FinalizeAt due: deadline fire_at and pending stream finalizeAt → 0. */
const forceFinalizeAtDue = async (stub: DurableObjectStub<MatchObject>): Promise<void> => {
  await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
    const sql = durableState.storage.sql
    sql.exec('UPDATE deadlines SET fire_at = 0 WHERE kind = ?', DeadlineKind.FinalizeAt)

    const row = sql
      .exec<{ session_json: string | null }>('SELECT session_json FROM match_state LIMIT 1')
      .toArray()[0]
    const sessionJson = row?.session_json

    if (sessionJson === null || sessionJson === undefined) {
      return
    }

    const play = JSON.parse(sessionJson) as {
      asyncPlay?: {
        players: Record<string, { pendingFinalization: boolean; finalizeAt: number | null }>
      }
    }

    if (play.asyncPlay === undefined) {
      return
    }

    for (const stream of Object.values(play.asyncPlay.players)) {
      if (stream.pendingFinalization && stream.finalizeAt !== null) {
        stream.finalizeAt = 0
      }
    }

    sql.exec('UPDATE match_state SET session_json = ?', JSON.stringify(play))
  })
}

describe('async lifecycle', () => {
  it('start_async sets play mode, darts owner, and 24h deadline', async () => {
    const stub = await startActiveMatch()
    await markOpponentDisconnectedLongEnough(stub, creatorUserId)
    const before = Date.now()
    const started = await stub.applyCommand(otherUserId, { name: MatchCommandName.StartAsync })

    expect(started.ok).toBe(true)
    expect(started.state?.playMode).toBe(PlayMode.Asynchronous)
    expect(started.state?.dartsOwnerUserId).toBe(creatorUserId)
    expect(started.state?.asyncStartedAt).toEqual(expect.any(Number))
    expect(started.state?.asyncStartedAt).toBeGreaterThanOrEqual(before)
    expect(
      started.state?.deadlines.some((deadline) => deadline.kind === DeadlineKind.AsyncDeadlineAt),
    ).toBe(true)
    expect(started.state?.asyncStateJson).toEqual(expect.any(String))
  })

  it('rejects start_async while the opponent is still active', async () => {
    const stub = await startActiveMatch()
    const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })

    expect(started.ok).toBe(false)
    expect(started.code).toBeDefined()

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.playMode).toBe(PlayMode.Synchronous)
  })

  it('allows start_async when opponent turn stalled (connected)', async () => {
    const stub = await startActiveMatch()
    const miss = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    expect(miss.ok).toBe(true)
    expect(miss.state?.activePlayerId).toBe(otherUserId)

    await markOpponentTurnStalled(stub, otherUserId)
    const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })

    expect(started.ok).toBe(true)
    expect(started.state?.playMode).toBe(PlayMode.Asynchronous)
  })

  it('rejects start_async when opponent disconnected too recently', async () => {
    const stub = await startActiveMatch()
    await markOpponentDisconnectedRecently(stub, otherUserId)
    const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })

    expect(started.ok).toBe(false)
    expect(started.state?.playMode ?? PlayMode.Synchronous).toBe(PlayMode.Synchronous)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.playMode).toBe(PlayMode.Synchronous)
  })

  it('lets both players record visits independently', async () => {
    const stub = await startAsyncMatch()

    const creatorVisit = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    expect(creatorVisit.ok).toBe(true)

    const otherVisit = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    expect(otherVisit.ok).toBe(true)
    expect(otherVisit.state?.status).toBe(MatchStatus.Active)
    expect(otherVisit.state?.playMode).toBe(PlayMode.Asynchronous)
  })

  it('abandon sets the opponent as winner', async () => {
    const stub = await startAsyncMatch()
    const abandoned = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.AbandonMatch,
    })

    expect(abandoned.ok).toBe(true)
    expect(abandoned.state?.status).toBe(MatchStatus.Completed)
    expect(abandoned.state?.endingKind).toBe(MatchEndingKind.Abandon)
    expect(abandoned.state?.winnerUserId).toBe(otherUserId)
  })

  it('supports propose, withdraw, and accept cancel', async () => {
    const stub = await startAsyncMatch()

    const proposed = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.ProposeCancel,
    })
    expect(proposed.ok).toBe(true)
    expect(proposed.state?.cancelProposalUserId).toBe(creatorUserId)

    const withdrawn = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.WithdrawCancel,
    })
    expect(withdrawn.ok).toBe(true)
    expect(withdrawn.state?.cancelProposalUserId).toBeNull()

    await stub.applyCommand(otherUserId, { name: MatchCommandName.ProposeCancel })
    const accepted = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.AcceptCancel,
    })

    expect(accepted.ok).toBe(true)
    expect(accepted.state?.status).toBe(MatchStatus.Cancelled)
    expect(accepted.state?.endingKind).toBe(MatchEndingKind.MutualCancel)
    expect(accepted.state?.winnerUserId).toBeNull()
  })

  it('cancels mutually when neither player finishes before the 24h alarm', async () => {
    const stub = await startAsyncMatch()

    await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
      durableState.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.AsyncDeadlineAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
    expect(state.state?.endingKind).toBe(MatchEndingKind.MutualCancel)
    expect(state.state?.winnerUserId).toBeNull()
  })

  it('awards an async timeout win when only one player finished before the 24h alarm', async () => {
    const stub = await startAsyncMatch()

    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.pendingFinalization).toBe(true)

    const finished = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.FinishMatch,
    })
    expect(finished.ok).toBe(true)
    expect(finished.state?.status).toBe(MatchStatus.Active)

    await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
      durableState.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.AsyncDeadlineAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Completed)
    expect(state.state?.endingKind).toBe(MatchEndingKind.AsyncTimeout)
    expect(state.state?.winnerUserId).toBe(creatorUserId)
  })

  it('resolves async result when both players finish', async () => {
    const stub = await startAsyncMatch()

    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.FinishMatch })

    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    const finished = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.FinishMatch,
    })

    expect(finished.ok).toBe(true)
    expect(finished.state?.status).toBe(MatchStatus.Completed)
    expect(finished.state?.endingKind).toBe(MatchEndingKind.AsyncResult)
    expect(finished.state?.winnerUserId).toBe(creatorUserId)

    const payload = JSON.parse(finished.state?.resultPayloadJson ?? 'null') as {
      session: {
        status: string
        visits: { playerId: string; checkout: boolean; voided?: boolean }[]
      }
    }
    const countingVisits = payload.session.visits.filter((entry) => entry.voided !== true)

    expect(payload.session.status).toBe('completed')
    expect(countingVisits.filter((entry) => entry.playerId === creatorUserId)).toHaveLength(1)
    expect(countingVisits.filter((entry) => entry.playerId === otherUserId)).toHaveLength(0)
    expect(countingVisits.some((entry) => entry.playerId === otherUserId && entry.checkout)).toBe(
      false,
    )
  })

  it('schedules FinalizeAt after checkout in async', async () => {
    const stub = await startAsyncMatch()
    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.pendingFinalization).toBe(true)
    expect(
      checkedOut.state?.deadlines.some((deadline) => deadline.kind === DeadlineKind.FinalizeAt),
    ).toBe(true)
  })

  it('schedules FinalizeAt after visit-score checkout in async', async () => {
    const stub = await startAsyncMatch()
    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisitScore,
      score: 40,
    })

    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.pendingFinalization).toBe(true)
    expect(
      checkedOut.state?.deadlines.some((deadline) => deadline.kind === DeadlineKind.FinalizeAt),
    ).toBe(true)
  })

  it('auto-finalizes only the due async player and stays Active', async () => {
    const stub = await startAsyncMatch()
    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.pendingFinalization).toBe(true)

    await forceFinalizeAtDue(stub)

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Active)
    expect(state.state?.pendingFinalization).toBe(false)
    expect(state.state?.endingKind).toBeNull()

    const asyncState = JSON.parse(state.state?.asyncStateJson ?? '{}') as {
      players: Record<string, { finalized: boolean }>
    }
    expect(asyncState.players[creatorUserId]?.finalized).toBe(true)
    expect(asyncState.players[otherUserId]?.finalized).toBe(false)
  })

  it('completes AsyncResult when both pending players auto-finalize via alarm', async () => {
    const stub = await startAsyncMatch()

    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    await forceFinalizeAtDue(stub)

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Completed)
    expect(state.state?.endingKind).toBe(MatchEndingKind.AsyncResult)
    expect(state.state?.winnerUserId).toBe(creatorUserId)
  })

  it('completes AsyncResult when one finished and the other auto-finalizes', async () => {
    const stub = await startAsyncMatch()

    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.FinishMatch })

    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    await forceFinalizeAtDue(stub)

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Completed)
    expect(state.state?.endingKind).toBe(MatchEndingKind.AsyncResult)
    expect(state.state?.winnerUserId).toBe(creatorUserId)
  })
})
