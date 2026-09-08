import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { createDartThrow } from '@open-darts/game/dartScoring'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { describe, expect, it } from 'vitest'
import type { MatchObject } from '../src/match/MatchObject'
import {
  CommandErrorCode,
  DeadlineKind,
  MatchCommandName,
  MatchEndingKind,
  MatchStatus,
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

const startCheckoutMatch = async (): Promise<DurableObjectStub<MatchObject>> => {
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

describe('sync play', () => {
  it('rejects a visit from the non-active player', async () => {
    const stub = await startCheckoutMatch()
    const result = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Forbidden,
    })
  })

  it('records a miss visit and advances the turn', async () => {
    const stub = await startCheckoutMatch()
    const result = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    expect(result.ok).toBe(true)
    expect(result.state?.activePlayerId).toBe(otherUserId)
    expect(result.state?.pendingFinalization).toBe(false)
    expect(
      result.state?.players.find((player) => player.userId === creatorUserId)?.lastVisitAt,
    ).toEqual(expect.any(Number))
  })

  it('lets the thrower undo before the opponent replies', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    const undone = await stub.applyCommand(creatorUserId, { name: MatchCommandName.UndoVisit })
    expect(undone.ok).toBe(true)
    expect(undone.state?.activePlayerId).toBe(creatorUserId)
    expect(undone.state?.pendingFinalization).toBe(false)
  })

  it('enters pending finalization on checkout and completes on finish', async () => {
    const stub = await startCheckoutMatch()
    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.status).toBe(MatchStatus.Active)
    expect(checkedOut.state?.pendingFinalization).toBe(true)
    expect(
      checkedOut.state?.deadlines.some((deadline) => deadline.kind === DeadlineKind.FinalizeAt),
    ).toBe(true)

    const finished = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.FinishMatch,
    })
    expect(finished.ok).toBe(true)
    expect(finished.state?.status).toBe(MatchStatus.Completed)
    expect(finished.state?.endingKind).toBe(MatchEndingKind.Checkout)
    expect(finished.state?.winnerUserId).toBe(creatorUserId)
    expect(finished.state?.pendingFinalization).toBe(false)
  })

  it('auto-completes when the finalize alarm fires', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
      durableState.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.FinalizeAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Completed)
    expect(state.state?.endingKind).toBe(MatchEndingKind.Checkout)
    expect(state.state?.winnerUserId).toBe(creatorUserId)
  })

  it('undoes pending finalization back to active play', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    const undone = await stub.applyCommand(creatorUserId, { name: MatchCommandName.UndoVisit })
    expect(undone.ok).toBe(true)
    expect(undone.state?.status).toBe(MatchStatus.Active)
    expect(undone.state?.pendingFinalization).toBe(false)
    expect(undone.state?.activePlayerId).toBe(creatorUserId)

    const again = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    expect(again).toMatchObject({ ok: false, code: CommandErrorCode.Forbidden })
  })

  it('rejects undo after the opponent has thrown', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    const undone = await stub.applyCommand(creatorUserId, { name: MatchCommandName.UndoVisit })
    expect(undone).toMatchObject({
      ok: false,
      code: CommandErrorCode.Forbidden,
      message: 'Can only undo your own visit',
    })
  })

  it('corrects a prior visit after the opponent has thrown', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    const corrected = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.CorrectVisit,
      visitIndex: 0,
      visitScore: 20,
    })

    expect(corrected.ok).toBe(true)
    expect(corrected.state?.activePlayerId).toBe(creatorUserId)
    expect(corrected.state?.pendingFinalization).toBe(false)

    const sessionJson = corrected.state?.sessionJson
    expect(sessionJson).toEqual(expect.any(String))
    const envelope = JSON.parse(sessionJson!) as {
      session: { visits: { visitIndex: number; visitScore: number; voided?: boolean }[] }
    }
    expect(envelope.session.visits.find((visit) => visit.visitIndex === 0)?.visitScore).toBe(20)
    expect(envelope.session.visits.find((visit) => visit.visitIndex === 1)?.voided).not.toBe(true)
  })

  it('voids later visits when a correction checkouts earlier', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })

    const corrected = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.CorrectVisit,
      visitIndex: 0,
      darts: toPublicDarts(checkoutDouble20()),
    })

    expect(corrected.ok).toBe(true)
    expect(corrected.state?.pendingFinalization).toBe(true)
    expect(corrected.state?.activePlayerId).toBe(creatorUserId)

    const envelope = JSON.parse(corrected.state!.sessionJson!) as {
      session: { visits: { visitIndex: number; voided?: boolean; checkout?: boolean }[] }
    }
    expect(envelope.session.visits.find((visit) => visit.visitIndex === 0)?.checkout).toBe(true)
    expect(envelope.session.visits.find((visit) => visit.visitIndex === 1)?.voided).toBe(true)
  })

  it('rejects mutating commands after the match is completed', async () => {
    const stub = await startCheckoutMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.FinishMatch })

    const result = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisitScore,
      score: 0,
    })
    expect(result).toMatchObject({ ok: false, code: CommandErrorCode.Terminal })

    const readable = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(readable.ok).toBe(true)
  })
})
