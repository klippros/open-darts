import type { PublicMatchState } from './types'
import { MatchEndingKind, MatchStatus } from './types'

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

const isWaitingCancel = (state: PublicMatchState): boolean =>
  state.status === MatchStatus.Cancelled &&
  (state.endingKind === MatchEndingKind.CreatorCancel ||
    state.endingKind === MatchEndingKind.LobbyTimeout)

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

const readErrorMessage = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => null)

  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message
  }

  return `Index request failed with ${String(response.status)}`
}

const restFetch = async (
  env: Env,
  path: string,
  init: { method: string; prefer: string; body?: string },
): Promise<void> => {
  const response = await fetch(restUrl(env.SUPABASE_URL, path), {
    method: init.method,
    headers: restHeaders(env.SUPABASE_SERVICE_ROLE_KEY, init.prefer),
    body: init.body,
  })

  if (response.ok || response.status === 204) {
    return
  }

  const message = await readErrorMessage(response)

  if (response.status === 409) {
    throw new IndexPublishError(IndexPublishErrorCode.Conflict, message)
  }

  throw new IndexPublishError(IndexPublishErrorCode.Unavailable, message)
}

const deleteIndexedMatch = async (env: Env, matchId: string): Promise<void> => {
  await restFetch(env, `online_matches?id=eq.${matchId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  })
}

const upsertIndexedMatch = async (env: Env, state: PublicMatchState): Promise<void> => {
  await restFetch(env, 'online_matches', {
    method: 'POST',
    prefer: 'return=minimal,resolution=merge-duplicates',
    body: JSON.stringify({
      id: state.matchId,
      invite_token: state.inviteToken,
      creator_user_id: state.creatorUserId,
      status: state.status,
      play_mode: state.playMode,
      mode: state.mode,
      config: state.config,
      legs_to_win: state.legsToWin,
      starting_player_slot: state.startingPlayerSlot,
      created_at: toIso(state.createdAt),
      started_at: state.startedAt === null ? null : toIso(state.startedAt),
      ending_kind: state.endingKind,
      winner_user_id: state.winnerUserId,
    }),
  })
}

const replaceIndexedPlayers = async (env: Env, state: PublicMatchState): Promise<void> => {
  await restFetch(env, `online_match_players?match_id=eq.${state.matchId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  })

  if (state.players.length === 0) {
    return
  }

  await restFetch(env, 'online_match_players', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(
      state.players.map((player) => ({
        match_id: state.matchId,
        user_id: player.userId,
        slot: player.slot,
      })),
    ),
  })
}

const replaceOccupancy = async (env: Env, state: PublicMatchState): Promise<void> => {
  await restFetch(env, `online_match_occupancy?match_id=eq.${state.matchId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  })

  if (state.players.length === 0) {
    return
  }

  await restFetch(env, 'online_match_occupancy', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(
      state.players.map((player) => ({
        user_id: player.userId,
        match_id: state.matchId,
      })),
    ),
  })
}

export const publishMatchIndex = async (env: Env, state: PublicMatchState): Promise<void> => {
  if (shouldSkipMatchIndexSync(env.SUPABASE_URL)) {
    return
  }

  if (isWaitingCancel(state)) {
    await deleteIndexedMatch(env, state.matchId)
    return
  }

  await upsertIndexedMatch(env, state)
  await replaceIndexedPlayers(env, state)
  await replaceOccupancy(env, state)
}
