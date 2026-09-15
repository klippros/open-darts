import { env, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { describe, expect, it } from 'vitest'
import type { MatchObject } from '../src/match/MatchObject'
import {
  CommandErrorCode,
  DeadlineKind,
  MatchCommandName,
  MatchStatus,
  STARTING_PLAYER_SLOT_RANDOM,
} from '../src/match/types'
import {
  createMatchId,
  creatorUserId,
  initWaitingMatch,
  otherUserId,
  signAccessToken,
  thirdUserId,
} from './helpers'

const inviteTokenOf = async (stub: DurableObjectStub<MatchObject>): Promise<string> => {
  const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
  const token = state.state?.inviteToken

  if (token === undefined) {
    throw new Error('Match has no invite token')
  }

  return token
}

const joinGuest = async (
  stub: DurableObjectStub<MatchObject>,
  userId = otherUserId,
): Promise<void> => {
  const joined = await stub.join({
    userId,
    inviteToken: await inviteTokenOf(stub),
  })

  if (!joined.ok) {
    throw new Error(joined.message ?? 'Failed to join match')
  }
}

describe('waiting room', () => {
  it('lets a second player join a waiting match', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Waiting)
    expect(state.state?.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: creatorUserId, slot: 0 }),
        expect.objectContaining({ userId: otherUserId, slot: 1 }),
      ]),
    )
  })

  it('rejects a join with the wrong invite token', async () => {
    const stub = await initWaitingMatch()
    const result = await stub.join({
      userId: otherUserId,
      inviteToken: crypto.randomUUID(),
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Forbidden,
    })
  })

  it('rejects a third player after the match is full', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)

    const result = await stub.join({
      userId: thirdUserId,
      inviteToken: await inviteTokenOf(stub),
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Conflict,
    })
  })

  it('is idempotent when a member joins again', async () => {
    const stub = await initWaitingMatch()
    const inviteToken = await inviteTokenOf(stub)
    const again = await stub.join({ userId: creatorUserId, inviteToken })

    expect(again.ok).toBe(true)
    expect(again.state?.players).toHaveLength(1)
  })

  it('lets the creator kick the guest and keeps the invite open', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)

    const kicked = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.KickPlayer,
      targetUserId: otherUserId,
    })

    expect(kicked.ok).toBe(true)
    expect(kicked.state?.players).toEqual([
      expect.objectContaining({ userId: creatorUserId, slot: 0 }),
    ])

    await joinGuest(stub)
    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.players).toHaveLength(2)
  })

  it('lets a guest leave a waiting match', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)

    const left = await stub.applyCommand(otherUserId, { name: MatchCommandName.LeaveWaiting })
    expect(left.ok).toBe(true)
    expect(left.state?.players).toEqual([
      expect.objectContaining({ userId: creatorUserId, slot: 0 }),
    ])
  })

  it('forbids the creator from leaving instead of cancelling', async () => {
    const stub = await initWaitingMatch()
    const result = await stub.applyCommand(creatorUserId, { name: MatchCommandName.LeaveWaiting })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Forbidden,
    })
  })

  it('forbids a guest from kicking or starting the match', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)

    const kick = await stub.applyCommand(otherUserId, {
      name: MatchCommandName.KickPlayer,
      targetUserId: creatorUserId,
    })
    const begin = await stub.applyCommand(otherUserId, { name: MatchCommandName.BeginMatch })

    expect(kick).toMatchObject({ ok: false, code: CommandErrorCode.Forbidden })
    expect(begin).toMatchObject({ ok: false, code: CommandErrorCode.Forbidden })
  })

  it('starts the match only when both players are present', async () => {
    const stub = await initWaitingMatch()
    const tooEarly = await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })
    expect(tooEarly).toMatchObject({ ok: false, code: CommandErrorCode.Invalid })

    await joinGuest(stub)
    const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    expect(started.ok).toBe(true)
    expect(started.state?.status).toBe(MatchStatus.Active)
    expect(started.state?.startedAt).toBeTypeOf('number')
    expect(started.state?.deadlines).toEqual([])
  })

  it('resolves a random first-throw preference when the match begins', async () => {
    const matchId = createMatchId()
    const stub = env.MATCH.getByName(matchId)
    const created = await stub.init({
      matchId,
      inviteToken: crypto.randomUUID(),
      creatorUserId,
      mode: GameModeId.X01,
      config: defaultX01Config(),
      legsToWin: 2,
      startingPlayerSlot: STARTING_PLAYER_SLOT_RANDOM,
    })

    expect(created.ok).toBe(true)
    expect(created.state?.startingPlayerSlot).toBe(STARTING_PLAYER_SLOT_RANDOM)

    await joinGuest(stub)
    const started = await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    expect(started.ok).toBe(true)
    expect([0, 1]).toContain(started.state?.startingPlayerSlot)
    expect(started.state?.activePlayerId).toBe(
      started.state?.startingPlayerSlot === 0 ? creatorUserId : otherUserId,
    )
  })

  it('clears the waiting alarm when the match becomes active', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    expect(await runDurableObjectAlarm(stub)).toBe(false)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Active)
  })

  it('does not cancel an already-started match if a waiting deadline is still stored', async () => {
    const stub = await initWaitingMatch()
    await joinGuest(stub)
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      state.storage.sql.exec(
        'INSERT INTO deadlines (kind, fire_at) VALUES (?, 0)',
        DeadlineKind.WaitingExpiresAt,
      )
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Active)
    expect(state.state?.endingKind).toBeNull()
  })

  it('rejects join after the lobby timeout cancels the match', async () => {
    const stub = await initWaitingMatch()
    const inviteToken = await inviteTokenOf(stub)

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      state.storage.sql.exec(
        'UPDATE deadlines SET fire_at = 0 WHERE kind = ?',
        DeadlineKind.WaitingExpiresAt,
      )
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const result = await stub.join({
      userId: otherUserId,
      inviteToken,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Terminal,
    })
  })

  it('creates a 501 waiting match over HTTP and accepts a join', async () => {
    const token = await signAccessToken(creatorUserId)
    const created = await exports.default.fetch('https://match.example/v1/matches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: GameModeId.X01,
        config: defaultX01Config(),
        legsToWin: 2,
        startingPlayerSlot: 0,
      }),
    })

    expect(created.status).toBe(201)
    const body = await created.json<{
      matchId: string
      inviteToken: string
      state: { status: string; players: { userId: string }[] }
    }>()
    expect(body.state.status).toBe(MatchStatus.Waiting)
    expect(body.state.players[0]?.userId).toBe(creatorUserId)

    const guestToken = await signAccessToken(otherUserId)
    const joined = await exports.default.fetch(
      `https://match.example/v1/matches/${body.matchId}/join`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${guestToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteToken: body.inviteToken }),
      },
    )

    expect(joined.status).toBe(200)
    const joinedBody = await joined.json<{ state: { players: { userId: string }[] } }>()
    expect(joinedBody.state.players).toHaveLength(2)
  })

  it('rejects HTTP create for a non-501 setup', async () => {
    const token = await signAccessToken(creatorUserId)
    const created = await exports.default.fetch('https://match.example/v1/matches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: GameModeId.X01,
        config: { startScore: 301, doubleIn: false, doubleOut: true },
        legsToWin: 2,
        startingPlayerSlot: 0,
      }),
    })

    expect(created.status).toBe(400)
  })
})
