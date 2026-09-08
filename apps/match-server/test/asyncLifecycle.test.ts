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
import { createMatchId, creatorUserId, otherUserId } from './helpers'

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
  const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })

  if (!started.ok) {
    throw new Error(started.message ?? 'start_async failed')
  }

  return stub
}

describe('async lifecycle', () => {
  it('start_async sets play mode, darts owner, and 24h deadline', async () => {
    const stub = await startActiveMatch()
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
  })
})
