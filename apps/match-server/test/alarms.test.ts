import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { MatchObject } from '../src/match/MatchObject'
import { DeadlineKind, MatchCommandName, MatchEndingKind, MatchStatus } from '../src/match/types'
import { creatorUserId, initWaitingMatch, otherUserId } from './helpers'

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
})
