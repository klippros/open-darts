import { readAccessUserId } from './auth'
import { corsPreflight } from './cors'
import { createMatch } from './createMatch'
import { jsonResponse } from './json'
import { joinMatch } from './joinMatch'
import { issueMatchTicket, verifyMatchTicket } from '../auth/ticket'
import { isUuid } from '../ids'
import { MATCH_USER_HEADER } from '../match/constants'

const matchTicketPath = /^\/v1\/matches\/([^/]+)\/ticket$/u
const matchSocketPath = /^\/v1\/matches\/([^/]+)\/ws$/u
const matchJoinPath = /^\/v1\/matches\/([^/]+)\/join$/u

const readMatchId = (pathname: string, pattern: RegExp): string | null => {
  const matched = pattern.exec(pathname)
  const matchId = matched?.[1]

  if (matchId === undefined || !isUuid(matchId)) {
    return null
  }

  return matchId
}

const issueTicket = async (request: Request, env: Env, matchId: string): Promise<Response> => {
  const access = await readAccessUserId(request, {
    jwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseUrl: env.SUPABASE_URL,
  })

  if (!access.ok) {
    return jsonResponse(request, { error: access.error }, 401)
  }

  const inspection = await env.MATCH.getByName(matchId).inspectForTicket(access.userId)

  if (inspection.kind === 'missing') {
    return jsonResponse(request, { error: 'not_found' }, 404)
  }

  if (inspection.kind === 'forbidden') {
    return jsonResponse(request, { error: 'forbidden' }, 403)
  }

  const ticket = await issueMatchTicket({ userId: access.userId, matchId }, env.SUPABASE_JWT_SECRET)

  return jsonResponse(request, ticket)
}

const acceptMatchSocket = async (
  request: Request,
  env: Env,
  matchId: string,
): Promise<Response> => {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return jsonResponse(request, { error: 'expected_websocket' }, 426)
  }

  const ticketToken = new URL(request.url).searchParams.get('ticket')

  if (ticketToken === null) {
    return jsonResponse(request, { error: 'missing_ticket' }, 401)
  }

  let ticket

  try {
    ticket = await verifyMatchTicket(ticketToken, env.SUPABASE_JWT_SECRET)
  } catch {
    return jsonResponse(request, { error: 'invalid_ticket' }, 401)
  }

  if (ticket.matchId !== matchId) {
    return jsonResponse(request, { error: 'forbidden' }, 403)
  }

  const inspection = await env.MATCH.getByName(matchId).inspectForTicket(ticket.userId)

  if (inspection.kind === 'missing') {
    return jsonResponse(request, { error: 'not_found' }, 404)
  }

  if (inspection.kind === 'forbidden') {
    return jsonResponse(request, { error: 'forbidden' }, 403)
  }

  const headers = new Headers(request.headers)
  headers.set(MATCH_USER_HEADER, ticket.userId)

  return env.MATCH.getByName(matchId).fetch(
    new Request(request, {
      headers,
    }),
  )
}

export const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return corsPreflight(request)
  }

  if (url.pathname === '/health') {
    return jsonResponse(request, { ok: true })
  }

  if (url.pathname === '/v1/matches') {
    if (request.method !== 'POST') {
      return jsonResponse(request, { error: 'method_not_allowed' }, 405)
    }

    const created = await createMatch(request, env)
    return created
  }

  const joinMatchId = readMatchId(url.pathname, matchJoinPath)

  if (joinMatchId !== null) {
    if (request.method !== 'POST') {
      return jsonResponse(request, { error: 'method_not_allowed' }, 405)
    }

    const joined = await joinMatch(request, env, joinMatchId)
    return joined
  }

  const ticketMatchId = readMatchId(url.pathname, matchTicketPath)

  if (ticketMatchId !== null) {
    if (request.method !== 'POST') {
      return jsonResponse(request, { error: 'method_not_allowed' }, 405)
    }

    const ticketResponse = await issueTicket(request, env, ticketMatchId)
    return ticketResponse
  }

  const socketMatchId = readMatchId(url.pathname, matchSocketPath)

  if (socketMatchId !== null) {
    if (request.method !== 'GET') {
      return jsonResponse(request, { error: 'method_not_allowed' }, 405)
    }

    const socketResponse = await acceptMatchSocket(request, env, socketMatchId)
    return socketResponse
  }

  return jsonResponse(request, { error: 'not_found' }, 404)
}
