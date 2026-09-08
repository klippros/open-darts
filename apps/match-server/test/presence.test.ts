import { describe, expect, it } from 'vitest'
import { MatchCommandName, MatchEndingKind, MatchStatus } from '../src/match/types'
import { creatorUserId, initWaitingMatch, openMatchSocket, otherUserId } from './helpers'

describe('match presence', () => {
  it('marks connected on websocket accept', async () => {
    const stub = await initWaitingMatch()
    const socket = await openMatchSocket(stub, creatorUserId)

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.players.find((player) => player.userId === creatorUserId)?.connected).toBe(
      true,
    )

    socket.close(1000, 'done')
  })

  it('close leaves status Active, connected false, endingKind null, no winner', async () => {
    const stub = await initWaitingMatch()
    const inviteToken = (
      await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    ).state?.inviteToken

    if (inviteToken === undefined) {
      throw new Error('missing invite')
    }

    await stub.join({ userId: otherUserId, inviteToken })
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    const socket = await openMatchSocket(stub, creatorUserId)
    socket.close(1000, 'client close')

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Active)
    expect(state.state?.players.find((player) => player.userId === creatorUserId)?.connected).toBe(
      false,
    )
    expect(state.state?.endingKind).toBeNull()
    expect(state.state?.winnerUserId).toBeNull()
  })

  it('second socket keeps connected true until last closes', async () => {
    const stub = await initWaitingMatch()
    const first = await openMatchSocket(stub, creatorUserId)
    const second = await openMatchSocket(stub, creatorUserId)

    first.close(1000, 'first close')

    let state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.players.find((player) => player.userId === creatorUserId)?.connected).toBe(
      true,
    )

    second.close(1000, 'second close')

    state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.players.find((player) => player.userId === creatorUserId)?.connected).toBe(
      false,
    )
  })

  it('abandon still completes unlike disconnect', async () => {
    const stub = await initWaitingMatch()
    const inviteToken = (
      await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    ).state?.inviteToken

    if (inviteToken === undefined) {
      throw new Error('missing invite')
    }

    await stub.join({ userId: otherUserId, inviteToken })
    await stub.applyCommand(creatorUserId, { name: MatchCommandName.BeginMatch })

    const socket = await openMatchSocket(stub, creatorUserId)
    const abandoned = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.AbandonMatch,
    })

    expect(abandoned.ok).toBe(true)
    expect(abandoned.state?.status).toBe(MatchStatus.Completed)
    expect(abandoned.state?.endingKind).toBe(MatchEndingKind.Abandon)
    expect(abandoned.state?.winnerUserId).toBe(otherUserId)

    socket.close(1000, 'done')
  })
})
