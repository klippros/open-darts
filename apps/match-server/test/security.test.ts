import { env } from 'cloudflare:workers'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { createDartThrow } from '@open-darts/game/dartScoring'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { describe, expect, it } from 'vitest'
import type { MatchObject } from '../src/match/MatchObject'
import {
  CommandErrorCode,
  MatchCommandName,
  MatchEndingKind,
  MatchStatus,
  PlayMode,
} from '../src/match/types'
import { createMatchId, creatorUserId, otherUserId, thirdUserId } from './helpers'

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

const startActiveMatch = async (): Promise<{
  stub: DurableObjectStub<MatchObject>
  inviteToken: string
}> => {
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

  return { stub, inviteToken }
}

describe('match security', () => {
  it('rejects join after the match has started', async () => {
    const { stub, inviteToken } = await startActiveMatch()

    const result = await stub.join({ userId: thirdUserId, inviteToken })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Invalid,
    })
  })

  it('rejects start_async while the match is still waiting', async () => {
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

    const result = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.StartAsync,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Invalid,
    })
  })

  it('rejects start_async when play is already asynchronous', async () => {
    const { stub } = await startActiveMatch()
    const first = await stub.applyCommand(creatorUserId, { name: MatchCommandName.StartAsync })
    expect(first.ok).toBe(true)
    expect(first.state?.playMode).toBe(PlayMode.Asynchronous)

    const again = await stub.applyCommand(otherUserId, { name: MatchCommandName.StartAsync })

    expect(again).toMatchObject({
      ok: false,
      code: CommandErrorCode.Invalid,
    })
  })

  it('rejects start_async during pending finalization', async () => {
    const { stub } = await startActiveMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    const result = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.StartAsync,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Invalid,
    })
  })

  it('rejects mutating commands after abandon', async () => {
    const { stub } = await startActiveMatch()
    const abandoned = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.AbandonMatch,
    })

    expect(abandoned.ok).toBe(true)
    expect(abandoned.state?.status).toBe(MatchStatus.Completed)
    expect(abandoned.state?.endingKind).toBe(MatchEndingKind.Abandon)

    const visit = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(missVisit()),
    })
    const finish = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.FinishMatch,
    })
    const undo = await stub.applyCommand(otherUserId, { name: MatchCommandName.UndoVisit })

    expect(visit).toMatchObject({ ok: false, code: CommandErrorCode.Terminal })
    expect(finish).toMatchObject({ ok: false, code: CommandErrorCode.Terminal })
    expect(undo).toMatchObject({ ok: false, code: CommandErrorCode.Terminal })

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
  })

  it('rejects finish and undo from a non-member', async () => {
    const { stub } = await startActiveMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    const finish = await stub.applyCommand(thirdUserId, {
      name: MatchCommandName.FinishMatch,
    })
    const undo = await stub.applyCommand(thirdUserId, { name: MatchCommandName.UndoVisit })

    expect(finish).toMatchObject({
      ok: false,
      code: CommandErrorCode.Unauthorized,
    })
    expect(undo).toMatchObject({
      ok: false,
      code: CommandErrorCode.Unauthorized,
    })
  })

  it('rejects undo from the opponent who did not throw the pending visit', async () => {
    const { stub } = await startActiveMatch()
    await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })

    const undo = await stub.applyCommand(otherUserId, { name: MatchCommandName.UndoVisit })

    expect(undo).toMatchObject({
      ok: false,
      code: CommandErrorCode.Forbidden,
    })
  })

  it('rejects finish_match before pending finalization', async () => {
    const { stub } = await startActiveMatch()

    const finish = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.FinishMatch,
    })

    expect(finish).toMatchObject({
      ok: false,
      code: CommandErrorCode.Invalid,
    })
  })

  it('rejects abandon from a non-member', async () => {
    const { stub } = await startActiveMatch()

    const result = await stub.applyCommand(thirdUserId, {
      name: MatchCommandName.AbandonMatch,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Unauthorized,
    })
  })
})
