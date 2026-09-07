import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { CommandErrorCode, MatchCommandName, MatchStatus } from '../src/match/types'
import { creatorUserId, initWaitingMatch, otherUserId } from './helpers'

describe('match commands', () => {
  it('rejects a command from a user who is not a member', async () => {
    const stub = await initWaitingMatch()
    const result = await stub.applyCommand(otherUserId, { name: MatchCommandName.Ping })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Unauthorized,
    })
  })

  it('rejects commands against an unknown match', async () => {
    const result = await env.MATCH.getByName(crypto.randomUUID()).applyCommand(creatorUserId, {
      name: MatchCommandName.Ping,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.NotFound,
    })
  })

  it('rejects mutating commands after the match is cancelled', async () => {
    const stub = await initWaitingMatch()
    const cancelled = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.CancelWaiting,
    })

    expect(cancelled.ok).toBe(true)
    expect(cancelled.state?.status).toBe(MatchStatus.Cancelled)

    const ping = await stub.applyCommand(creatorUserId, { name: MatchCommandName.Ping })
    expect(ping).toMatchObject({
      ok: false,
      code: CommandErrorCode.Terminal,
    })

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.ok).toBe(true)
  })

  it('rejects cancel from someone who is not a member', async () => {
    const stub = await initWaitingMatch()
    const result = await stub.applyCommand(otherUserId, { name: MatchCommandName.CancelWaiting })

    expect(result).toMatchObject({
      ok: false,
      code: CommandErrorCode.Unauthorized,
    })
  })
})
