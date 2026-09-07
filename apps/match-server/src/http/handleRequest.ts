import { readBearerToken, verifySupabaseAccessToken } from '../auth/jwt'
import { issueMatchTicket, verifyMatchTicket } from '../auth/ticket'
import { isUuid } from '../ids'
import { MATCH_USER_HEADER } from '../match/constants'
import { corsPreflight, withCors } from './cors'

const json = (request: Request, body: unknown, status = 200): Response =>
  withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const matchTicketPath = /^\/v1\/matches\/([^/]+)\/ticket$/u
const matchSocketPath = /^\/v1\/matches\/([^/]+)\/ws$/u

const readMatchId = (pathname: string, pattern: RegExp): string | null => {
  const matched = pattern.exec(pathname)
  const matchId = matched?.[1]

  if (matchId === undefined || !isUuid(matchId)) {
    return null
  }

  return matchId
}

const issueTicket = async (request: Request, env: Env, matchId: string): Promise<Response> => {
  const bearer = readBearerToken(request)

  if (bearer === null) {
    return json(request, { error: 'missing_token' }, 401)
  }

  let userId: string

  try {
    const payload = await verifySupabaseAccessToken(bearer, env.SUPABASE_JWT_SECRET)
    userId = payload.sub
  } catch {
    return json(request, { error: 'invalid_token' }, 401)
  }

  if (!isUuid(userId)) {
    return json(request, { error: 'invalid_token' }, 401)
  }

  const inspection = await env.MATCH.getByName(matchId).inspectForTicket(userId)

  if (inspection.kind === 'missing') {
    return json(request, { error: 'not_found' }, 404)
  }

  if (inspection.kind === 'forbidden') {
    return json(request, { error: 'forbidden' }, 403)
  }

  const ticket = await issueMatchTicket({ userId, matchId }, env.SUPABASE_JWT_SECRET)

  return json(request, ticket)
}

const acceptMatchSocket = async (
  request: Request,
  env: Env,
  matchId: string,
): Promise<Response> => {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return json(request, { error: 'expected_websocket' }, 426)
  }

  const ticketToken = new URL(request.url).searchParams.get('ticket')

  if (ticketToken === null) {
    return json(request, { error: 'missing_ticket' }, 401)
  }

  let ticket

  try {
    ticket = await verifyMatchTicket(ticketToken, env.SUPABASE_JWT_SECRET)
  } catch {
    return json(request, { error: 'invalid_ticket' }, 401)
  }

  if (ticket.matchId !== matchId) {
    return json(request, { error: 'forbidden' }, 403)
  }

  const inspection = await env.MATCH.getByName(matchId).inspectForTicket(ticket.userId)

  if (inspection.kind === 'missing') {
    return json(request, { error: 'not_found' }, 404)
  }

  if (inspection.kind === 'forbidden') {
    return json(request, { error: 'forbidden' }, 403)
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
    return json(request, { ok: true })
  }

  const ticketMatchId = readMatchId(url.pathname, matchTicketPath)

  if (ticketMatchId !== null) {
    if (request.method !== 'POST') {
      return json(request, { error: 'method_not_allowed' }, 405)
    }

    const ticketResponse = await issueTicket(request, env, ticketMatchId)
    return ticketResponse
  }

  const socketMatchId = readMatchId(url.pathname, matchSocketPath)

  if (socketMatchId !== null) {
    if (request.method !== 'GET') {
      return json(request, { error: 'method_not_allowed' }, 405)
    }

    const socketResponse = await acceptMatchSocket(request, env, socketMatchId)
    return socketResponse
  }

  return json(request, { error: 'not_found' }, 404)
}
