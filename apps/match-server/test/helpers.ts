import { env } from 'cloudflare:workers'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { signHs256Jwt } from '../src/auth/jwt'
import { TEST_SUPABASE_JWT_SECRET } from './secrets'
import type { MatchObject } from '../src/match/MatchObject'

export const creatorUserId = '11111111-1111-4111-8111-111111111111'
export const otherUserId = '22222222-2222-4222-8222-222222222222'
export const thirdUserId = '33333333-3333-4333-8333-333333333333'

export const createMatchId = (): string => crypto.randomUUID()

export const signAccessToken = (
  userId: string,
  options: { role?: string; secret?: string; expOffsetSeconds?: number } = {},
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000)

  return signHs256Jwt(
    {
      sub: userId,
      role: options.role ?? 'authenticated',
      aud: 'authenticated',
      exp: now + (options.expOffsetSeconds ?? 3600),
    },
    options.secret ?? TEST_SUPABASE_JWT_SECRET,
  )
}

export const initWaitingMatch = async (
  matchId = createMatchId(),
): Promise<DurableObjectStub<MatchObject>> => {
  const stub = env.MATCH.getByName(matchId)
  const result = await stub.init({
    matchId,
    inviteToken: crypto.randomUUID(),
    creatorUserId,
    mode: GameModeId.X01,
    config: defaultX01Config(),
    legsToWin: 2,
    startingPlayerSlot: 0,
  })

  if (!result.ok) {
    throw new Error(result.message ?? 'Failed to create match')
  }

  return stub
}
