import { isRecord } from '../json'
import type { PublicMatchState } from './types'

export enum IndexPublishErrorCode {
  Conflict = 'conflict',
  Unavailable = 'unavailable',
}

export class IndexPublishError extends Error {
  readonly code: IndexPublishErrorCode

  constructor(code: IndexPublishErrorCode, message: string) {
    super(message)
    this.name = 'IndexPublishError'
    this.code = code
  }
}

export const shouldSkipMatchIndexSync = (supabaseUrl: string): boolean =>
  supabaseUrl.length === 0 || supabaseUrl.includes('example.invalid')

const toIso = (ms: number): string => new Date(ms).toISOString()

const restHeaders = (serviceRoleKey: string, prefer: string): Headers => {
  const headers = new Headers()
  headers.set('apikey', serviceRoleKey)
  headers.set('Authorization', `Bearer ${serviceRoleKey}`)
  headers.set('Content-Type', 'application/json')
  headers.set('Prefer', prefer)
  return headers
}

const restUrl = (supabaseUrl: string, path: string): string =>
  `${supabaseUrl.replace(/\/$/u, '')}/rest/v1/${path}`

const readErrorPayload = async (
  response: Response,
): Promise<{ message: string; code: string | null }> => {
  const body: unknown = await response.json().catch(() => null)

  if (!isRecord(body)) {
    return { message: `Index request failed with ${String(response.status)}`, code: null }
  }

  const message =
    typeof body.message === 'string'
      ? body.message
      : typeof body.msg === 'string'
        ? body.msg
        : `Index request failed with ${String(response.status)}`
  const code = typeof body.code === 'string' ? body.code : null

  return { message, code }
}

export const publishMatchIndex = async (env: Env, state: PublicMatchState): Promise<void> => {
  if (shouldSkipMatchIndexSync(env.SUPABASE_URL)) {
    return
  }

  let resultPayload: Record<string, unknown> | null = null

  if (state.resultPayloadJson !== null) {
    const parsed: unknown = JSON.parse(state.resultPayloadJson)

    if (isRecord(parsed)) {
      resultPayload = parsed
    }
  }

  const response = await fetch(restUrl(env.SUPABASE_URL, 'rpc/publish_online_match_index'), {
    method: 'POST',
    headers: restHeaders(env.SUPABASE_SERVICE_ROLE_KEY, 'return=minimal'),
    body: JSON.stringify({
      p_match_id: state.matchId,
      p_invite_token: state.inviteToken,
      p_creator_user_id: state.creatorUserId,
      p_status: state.status,
      p_play_mode: state.playMode,
      p_mode: state.mode,
      p_config: state.config,
      p_legs_to_win: state.legsToWin,
      p_starting_player_slot: state.startingPlayerSlot,
      p_created_at: toIso(state.createdAt),
      p_started_at: state.startedAt === null ? null : toIso(state.startedAt),
      p_completed_at: state.completedAt === null ? null : toIso(state.completedAt),
      p_async_started_at: state.asyncStartedAt === null ? null : toIso(state.asyncStartedAt),
      p_ending_kind: state.endingKind,
      p_winner_user_id: state.winnerUserId,
      p_result_payload: resultPayload,
      p_index_version: state.version,
      p_players: state.players.map((player) => ({
        user_id: player.userId,
        slot: player.slot,
      })),
    }),
  })

  if (response.ok || response.status === 204) {
    return
  }

  const error = await readErrorPayload(response)

  if (
    response.status === 409 ||
    error.code === '23505' ||
    error.message.includes('occupancy_conflict')
  ) {
    throw new IndexPublishError(IndexPublishErrorCode.Conflict, error.message)
  }

  throw new IndexPublishError(IndexPublishErrorCode.Unavailable, error.message)
}
