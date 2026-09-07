import { signHs256Jwt, verifyHs256Jwt } from './jwt'

export const TICKET_ISSUER = 'open-darts-match-server'
export const TICKET_AUDIENCE = 'match-ws'
export const TICKET_TTL_SECONDS = 120

export interface MatchTicket {
  userId: string
  matchId: string
  exp: number
}

export const issueMatchTicket = async (
  params: { userId: string; matchId: string },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<{ token: string; expiresAt: number }> => {
  const exp = nowSeconds + TICKET_TTL_SECONDS
  const token = await signHs256Jwt(
    {
      iss: TICKET_ISSUER,
      aud: TICKET_AUDIENCE,
      sub: params.userId,
      matchId: params.matchId,
      exp,
    },
    secret,
  )

  return { token, expiresAt: exp }
}

export const verifyMatchTicket = async (token: string, secret: string): Promise<MatchTicket> => {
  const payload = await verifyHs256Jwt(token, secret)

  if (payload.iss !== TICKET_ISSUER || payload.aud !== TICKET_AUDIENCE) {
    throw new Error('JWT is not a match ticket')
  }

  if (typeof payload.matchId !== 'string' || payload.matchId.length === 0) {
    throw new Error('Ticket is missing matchId')
  }

  if (typeof payload.exp !== 'number') {
    throw new Error('Ticket is missing exp')
  }

  return {
    userId: payload.sub,
    matchId: payload.matchId,
    exp: payload.exp,
  }
}
