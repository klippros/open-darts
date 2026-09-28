import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { createDartThrow } from '@open-darts/game/dartScoring'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { describe, expect, it } from 'vitest'
import { compareDeadlineKindPriority, dueDeadlineKinds } from '../src/match/alarms'
import { MatchObject } from '../src/match/MatchObject'
import { DeadlineKind, MatchCommandName, MatchEndingKind, MatchStatus } from '../src/match/types'
import { createMatchId, creatorUserId, initWaitingMatch, otherUserId } from './helpers'

const checkoutDouble20 = () => [
  createDartThrow(
    { type: DartSegmentType.Number, value: 20 },
    DartMultiplier.Double,
    '2026-01-01T00:00:00.000Z',
  ),
]

const toPublicDarts = (darts: ReturnType<typeof checkoutDouble20>) =>
  darts.map((dart) => ({
    segment:
      dart.segment.type === DartSegmentType.Number
        ? { type: 'number' as const, value: dart.segment.value }
        : { type: dart.segment.type },
    multiplier: dart.multiplier,
    points: dart.points,
    timestamp: dart.timestamp,
  }))

describe('deadline priority', () => {
  it('orders finalize before async, idle, and waiting', () => {
    const kinds = [
      DeadlineKind.WaitingExpiresAt,
      DeadlineKind.IdleExpiresAt,
      DeadlineKind.AsyncDeadlineAt,
      DeadlineKind.FinalizeAt,
    ]

    expect([...kinds].sort(compareDeadlineKindPriority)).toEqual([
      DeadlineKind.FinalizeAt,
      DeadlineKind.AsyncDeadlineAt,
      DeadlineKind.IdleExpiresAt,
      DeadlineKind.WaitingExpiresAt,
    ])
  })
})

describe('match alarms', () => {
  it('cancels a still-waiting match when the lobby deadline fires', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (instance: MatchObject, state) => {
      expect(instance).toBeInstanceOf(MatchObject)
      state.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.WaitingExpiresAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
    expect(state.state?.endingKind).toBe(MatchEndingKind.LobbyTimeout)
    expect(state.state?.deadlines).toEqual([])

    expect(await runDurableObjectAlarm(stub)).toBe(false)
  })

  it('does not cancel a match that already left waiting', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      state.storage.sql.exec('UPDATE match_state SET status = ?', MatchStatus.Active)
      state.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.WaitingExpiresAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
    expect(state.state?.status).toBe(MatchStatus.Active)
    expect(state.state?.endingKind).toBeNull()
  })

  it('is a no-op when the waiting match was already cancelled', async () => {
    const stub = await initWaitingMatch()
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.CancelWaiting })

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      state.storage.sql.exec(
        'INSERT INTO deadlines (kind, fire_at) VALUES (?, 0)',
        DeadlineKind.WaitingExpiresAt,
      )
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
    expect(state.state?.endingKind).toBe(MatchEndingKind.CreatorCancel)
  })

  it('cancels an active sync match when the idle deadline fires', async () => {
    const stub = await initWaitingMatch()
    const invite = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    const inviteToken = invite.state?.inviteToken

    if (inviteToken === undefined) {
      throw new Error('missing invite')
    }

    await stub.join({ userId: otherUserId, inviteToken })
    const began = await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })
    expect(began.ok).toBe(true)
    expect(
      began.state?.deadlines.some((deadline) => deadline.kind === DeadlineKind.IdleExpiresAt),
    ).toBe(true)

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      state.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.IdleExpiresAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
    expect(state.state?.endingKind).toBe(MatchEndingKind.IdleTimeout)
    expect(state.state?.deadlines).toEqual([])
  })

  it('prefers finalize over idle when both deadlines are due in one wake', async () => {
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
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    const checkedOut = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.RecordVisit,
      darts: toPublicDarts(checkoutDouble20()),
    })
    expect(checkedOut.ok).toBe(true)
    expect(checkedOut.state?.pendingFinalization).toBe(true)

    await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
      const sql = durableState.storage.sql
      sql.exec('UPDATE deadlines SET fire_at = 0 WHERE kind = ?', DeadlineKind.FinalizeAt)
      sql.exec(
        `
          INSERT INTO deadlines (kind, fire_at) VALUES (?, 0)
          ON CONFLICT(kind) DO UPDATE SET fire_at = 0
        `,
        DeadlineKind.IdleExpiresAt,
      )

      const due = dueDeadlineKinds(sql, Date.now())
      expect(due[0]).toBe(DeadlineKind.FinalizeAt)
      expect(due).toContain(DeadlineKind.IdleExpiresAt)
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
    expect(state.state?.status).toBe(MatchStatus.Completed)
    expect(state.state?.endingKind).toBe(MatchEndingKind.Checkout)
    expect(state.state?.winnerUserId).toBe(creatorUserId)
  })
})
