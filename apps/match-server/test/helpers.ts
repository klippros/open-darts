import { runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { signHs256Jwt } from '../src/auth/jwt'
import {
  ASYNC_DISCONNECT_MS,
  ASYNC_VISIT_STALL_MS,
  MATCH_USER_HEADER,
} from '../src/match/constants'
import type { MatchObject } from '../src/match/MatchObject'
import { TEST_SUPABASE_JWT_SECRET } from './secrets'

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

/** Ages opponent presence so start_async passes the disconnect inactivity gate. */
export const markOpponentDisconnectedLongEnough = async (
  stub: DurableObjectStub<MatchObject>,
  opponentUserId: string,
): Promise<void> => {
  await runInDurableObject(stub, (_instance: MatchObject, durableState) => {
    durableState.storage.sql.exec(
      `
        UPDATE match_players
        SET connected = 0, last_seen_at = ?
        WHERE user_id = ?
      `,
      Date.now() - ASYNC_DISCONNECT_MS,
      opponentUserId,
    )
  })
}

/** Disconnects the opponent, but not long enough for start_async. */
export const markOpponentDisconnectedRecently = async (
  stub: DurableObjectStub<MatchObject>,
  opponentUserId: string,
): Promise<void> => {
  await runInDurableObject(stub, (_instance: MatchObject, durableState) => {
    durableState.storage.sql.exec(
      `
        UPDATE match_players
        SET connected = 0, last_seen_at = ?
        WHERE user_id = ?
      `,
      Date.now() - ASYNC_DISCONNECT_MS + 1000,
      opponentUserId,
    )
  })
}

/**
 * Ages turn anchors past ASYNC_VISIT_STALL_MS while keeping the opponent connected.
 * Caller must ensure the opponent is the active player (e.g. after a miss visit).
 */
export const markOpponentTurnStalled = async (
  stub: DurableObjectStub<MatchObject>,
  opponentUserId: string,
): Promise<void> => {
  const stalledAt = Date.now() - ASYNC_VISIT_STALL_MS

  await runInDurableObject(stub, (_instance: MatchObject, durableState) => {
    durableState.storage.sql.exec('UPDATE match_state SET started_at = ?', stalledAt)
    durableState.storage.sql.exec('UPDATE match_players SET last_visit_at = ?', stalledAt)
    durableState.storage.sql.exec(
      `
        UPDATE match_players
        SET connected = 1
        WHERE user_id = ?
      `,
      opponentUserId,
    )
  })
}

export const openMatchSocket = async (
  stub: DurableObjectStub<MatchObject>,
  userId: string,
): Promise<WebSocket> => {
  const response = await stub.fetch('https://match/ws', {
    headers: {
      Upgrade: 'websocket',
      [MATCH_USER_HEADER]: userId,
    },
  })

  if (response.status !== 101 || response.webSocket === null) {
    throw new Error(`Expected WebSocket upgrade, got ${String(response.status)}`)
  }

  response.webSocket.accept()
  return response.webSocket
}
