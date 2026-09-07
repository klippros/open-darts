import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { MatchCommandName } from '../src/match/types'
import {
  createMatchId,
  creatorUserId,
  initWaitingMatch,
  otherUserId,
  signAccessToken,
} from './helpers'

const ticketUrl = (matchId: string): string => `https://match.example/v1/matches/${matchId}/ticket`

describe('match tickets', () => {
  it('rejects a forged access token', async () => {
    const matchId = createMatchId()
    await initWaitingMatch(matchId)
    const token = await signAccessToken(creatorUserId, {
      secret: 'other-secret-at-least-32-characters',
    })

    const response = await exports.default.fetch(ticketUrl(matchId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(401)
  })

  it('rejects a service-role token', async () => {
    const matchId = createMatchId()
    await initWaitingMatch(matchId)
    const token = await signAccessToken(creatorUserId, { role: 'service_role' })

    const response = await exports.default.fetch(ticketUrl(matchId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(401)
  })

  it('rejects an unknown match', async () => {
    const token = await signAccessToken(creatorUserId)
    const response = await exports.default.fetch(ticketUrl(createMatchId()), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(404)
  })

  it('rejects a non-member', async () => {
    const matchId = createMatchId()
    await initWaitingMatch(matchId)
    const token = await signAccessToken(otherUserId)

    const response = await exports.default.fetch(ticketUrl(matchId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(403)
  })

  it('issues a ticket for a member', async () => {
    const matchId = createMatchId()
    await initWaitingMatch(matchId)
    const token = await signAccessToken(creatorUserId)

    const response = await exports.default.fetch(ticketUrl(matchId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(200)
    const body = await response.json<{ token: string; expiresAt: number }>()
    expect(body.token.split('.')).toHaveLength(3)
    expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('rejects using an access token as a websocket ticket', async () => {
    const matchId = createMatchId()
    await initWaitingMatch(matchId)
    const token = await signAccessToken(creatorUserId)

    const response = await exports.default.fetch(
      `https://match.example/v1/matches/${matchId}/ws?ticket=${token}`,
      { headers: { Upgrade: 'websocket' } },
    )

    expect(response.status).toBe(401)
  })

  it('inspects membership from the durable object', async () => {
    const matchId = createMatchId()
    const stub = await initWaitingMatch(matchId)

    expect(await stub.inspectForTicket(creatorUserId)).toEqual({ kind: 'ok' })
    expect(await stub.inspectForTicket(otherUserId)).toEqual({ kind: 'forbidden' })
    expect(await env.MATCH.getByName(createMatchId()).inspectForTicket(creatorUserId)).toEqual({
      kind: 'missing',
    })
  })

  it('ignores a client-supplied slot on ping', async () => {
    const stub = await initWaitingMatch()
    const result = await stub.applyCommand(creatorUserId, {
      name: MatchCommandName.Ping,
    })

    expect(result.ok).toBe(true)
    expect(result.state?.players[0]?.slot).toBe(0)
    expect(result.state?.players[0]?.userId).toBe(creatorUserId)
  })
})
