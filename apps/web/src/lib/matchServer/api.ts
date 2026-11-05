import { GameModeId } from '@open-darts/game/types/gameMode'
import { parseGameSession } from '@open-darts/game/game/serializeGame'
import { supabaseClient } from '../supabase/client'
import { HISTORY_PAGE_SIZE } from '../history/historyPager'
import { isMatchServerConfigured, matchServerUrl } from './config'
import type {
  CreateMatchRequest,
  CreateMatchResponse,
  InProgressOnlineMatchRow,
  JoinMatchResponse,
  MatchPlayerSlot,
  MatchTicketResponse,
  OnlineMatchHistoryRow,
  OnlineMatchInvite,
  OnlineMatchSummary,
  PublicMatchState,
} from './types'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { MatchEndingKind, MatchStatus, PlayMode, V1_ONLINE_X01_CONFIG } from './types'
import {
  defaultOnlineGameConfigForMode,
  readOnlineGameConfig,
} from '@open-darts/game/game/onlineMatchSetup'
import type { OnlineMatchConfig, OnlineMatchMode } from '@open-darts/game/game/onlineMatchSetup'

export class MatchServerApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = 'MatchServerApiError'
    this.status = status
    this.code = code
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const getAccessToken = async (): Promise<string | null> => {
  if (supabaseClient === null) {
    return null
  }

  const { data, error } = await supabaseClient.auth.getSession()

  if (error !== null || data.session === null) {
    return null
  }

  return data.session.access_token
}

const requireMatchServerUrl = (): string => {
  if (!isMatchServerConfigured || matchServerUrl === undefined) {
    throw new MatchServerApiError('Match server is not configured', 503, 'not_configured')
  }

  return matchServerUrl.replace(/\/$/u, '')
}

const requireAccessToken = async (): Promise<string> => {
  const token = await getAccessToken()

  if (token === null) {
    throw new MatchServerApiError('Not signed in', 401, 'unauthorized')
  }

  return token
}

const readErrorPayload = async (
  response: Response,
): Promise<{ error?: string; message?: string }> => {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload)) {
      return {}
    }

    return {
      ...(typeof payload.error === 'string' ? { error: payload.error } : {}),
      ...(typeof payload.message === 'string' ? { message: payload.message } : {}),
    }
  } catch {
    return {}
  }
}

const matchServerFetch = async (
  path: string,
  init: { method: string; accessToken: string; body?: string },
): Promise<unknown> => {
  const baseUrl = requireMatchServerUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method,
    body: init.body,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${init.accessToken}`,
    },
  })

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    throw new MatchServerApiError(
      payload.message ?? payload.error ?? `Request failed (${response.status})`,
      response.status,
      payload.error ?? null,
    )
  }

  const payload: unknown = await response.json()
  return payload
}

export const buildV1CreateMatchBody = (
  legsToWin: number,
  startingPlayerSlot: MatchPlayerSlot,
): CreateMatchRequest => ({
  mode: GameModeId.X01,
  config: { ...V1_ONLINE_X01_CONFIG },
  legsToWin,
  startingPlayerSlot,
})

export const buildOnlineCreateMatchBody = (
  mode: OnlineMatchMode,
  config: OnlineMatchConfig,
  legsToWin: number,
  startingPlayerSlot: MatchPlayerSlot,
): CreateMatchRequest => ({
  mode,
  config,
  legsToWin,
  startingPlayerSlot,
})

const asCreateMatchResponse = (payload: unknown): CreateMatchResponse => {
  if (
    !isRecord(payload) ||
    typeof payload.matchId !== 'string' ||
    typeof payload.inviteToken !== 'string' ||
    !isPublicMatchState(payload.state)
  ) {
    throw new MatchServerApiError('Invalid create match response', 500, 'invalid_response')
  }

  return {
    matchId: payload.matchId,
    inviteToken: payload.inviteToken,
    state: payload.state,
  }
}

const asJoinMatchResponse = (payload: unknown): JoinMatchResponse => {
  if (
    !isRecord(payload) ||
    typeof payload.matchId !== 'string' ||
    !isPublicMatchState(payload.state)
  ) {
    throw new MatchServerApiError('Invalid join match response', 500, 'invalid_response')
  }

  return {
    matchId: payload.matchId,
    state: payload.state,
  }
}

const asMatchTicketResponse = (payload: unknown): MatchTicketResponse => {
  if (
    !isRecord(payload) ||
    typeof payload.token !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    throw new MatchServerApiError('Invalid ticket response', 500, 'invalid_response')
  }

  return {
    token: payload.token,
    expiresAt: payload.expiresAt,
  }
}

export const createMatch = async (
  legsToWin: number,
  startingPlayerSlot: MatchPlayerSlot,
  options?: {
    mode?: OnlineMatchMode
    config?: OnlineMatchConfig
  },
): Promise<CreateMatchResponse> => {
  const accessToken = await requireAccessToken()
  const mode = options?.mode ?? GameModeId.X01
  const config = options?.config ?? defaultOnlineGameConfigForMode(mode)
  const payload = await matchServerFetch('/v1/matches', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(buildOnlineCreateMatchBody(mode, config, legsToWin, startingPlayerSlot)),
  })

  return asCreateMatchResponse(payload)
}

export const joinMatch = async (
  matchId: string,
  inviteToken: string,
): Promise<JoinMatchResponse> => {
  const accessToken = await requireAccessToken()
  const payload = await matchServerFetch(`/v1/matches/${matchId}/join`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ inviteToken }),
  })

  return asJoinMatchResponse(payload)
}

export const fetchMatchTicket = async (matchId: string): Promise<MatchTicketResponse> => {
  const accessToken = await requireAccessToken()
  const payload = await matchServerFetch(`/v1/matches/${matchId}/ticket`, {
    method: 'POST',
    accessToken,
  })

  return asMatchTicketResponse(payload)
}

export const buildMatchWebSocketUrl = (matchId: string, ticket: string): string => {
  const baseUrl = requireMatchServerUrl()
  const url = new URL(`${baseUrl}/v1/matches/${matchId}/ws`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('ticket', ticket)
  return url.toString()
}

export const buildInvitePath = (inviteToken: string): string => `/match/join/${inviteToken}`

export const buildInviteAbsoluteUrl = (
  inviteToken: string,
  origin = window.location.origin,
  baseUrl: string = typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/tools/open-darts/',
): string => {
  const basePath = baseUrl.replace(/\/$/u, '')
  return `${origin}${basePath}${buildInvitePath(inviteToken)}`
}

export const buildMatchPath = (matchId: string): string => `/match/${matchId}`

const mapInviteRow = (row: Record<string, unknown>): OnlineMatchInvite => ({
  matchId: readString(row.match_id),
  status: readString(row.status),
  creatorUserId: readString(row.creator_user_id),
  creatorDisplayName: readString(row.creator_display_name, 'Opponent'),
  mode: readString(row.mode),
  config: readOnlineGameConfig(row.config, readString(row.mode)),
  legsToWin: readNumber(row.legs_to_win),
  startingPlayerSlot: readNumber(row.starting_player_slot),
  playerCount: readNumber(row.player_count),
})

export const lookupOnlineMatchInvite = async (
  inviteToken: string,
): Promise<OnlineMatchInvite | null> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('lookup_online_match_invite', {
    p_invite_token: inviteToken,
  })

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  const data: unknown = result.data
  const rows = Array.isArray(data) ? data : data === null || data === undefined ? [] : [data]
  const first: unknown = rows[0]

  if (!isRecord(first)) {
    return null
  }

  return mapInviteRow(first)
}

const isMatchStatus = (value: string): value is MatchStatus =>
  (Object.values(MatchStatus) as string[]).includes(value)

const isPlayMode = (value: string): value is PlayMode =>
  (Object.values(PlayMode) as string[]).includes(value)

const isMatchEndingKind = (value: string): value is MatchEndingKind =>
  (Object.values(MatchEndingKind) as string[]).includes(value)

const isGameModeId = (value: string): value is GameModeId =>
  (Object.values(GameModeId) as string[]).includes(value)

const mapInProgressRow = (row: Record<string, unknown>): InProgressOnlineMatchRow | null => {
  if (typeof row.id !== 'string') {
    return null
  }

  const statusRaw = readString(row.status)

  if (!isMatchStatus(statusRaw)) {
    return null
  }

  return {
    id: row.id,
    status: statusRaw,
    mode: readString(row.mode),
    legs_to_win: readNumber(row.legs_to_win),
    invite_token: readString(row.invite_token),
  }
}

export const getMyInProgressOnlineMatch = async (): Promise<InProgressOnlineMatchRow | null> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('get_my_in_progress_online_match')

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  const data: unknown = result.data
  const rows = Array.isArray(data) ? data : data === null || data === undefined ? [] : [data]
  const first: unknown = rows[0]

  if (!isRecord(first)) {
    return null
  }

  return mapInProgressRow(first)
}

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const resolveOpponent = (
  viewerUserId: string,
  playerUserIds: string[],
  playerDisplayNames: string[],
): { opponentUserId: string | null; opponentDisplayName: string | null } => {
  const opponentIndex = playerUserIds.findIndex((id) => id !== viewerUserId)

  if (opponentIndex < 0) {
    return { opponentUserId: null, opponentDisplayName: null }
  }

  return {
    opponentUserId: playerUserIds[opponentIndex] ?? null,
    opponentDisplayName: playerDisplayNames[opponentIndex] ?? null,
  }
}

const mapSummaryRow = (
  row: Record<string, unknown>,
  viewerUserId: string,
): OnlineMatchSummary | null => {
  if (typeof row.id !== 'string') {
    return null
  }

  const statusRaw = readString(row.status)
  const playModeRaw = readString(row.play_mode)
  const endingKindRaw = readString(row.ending_kind)
  const modeRaw = readString(row.mode)

  if (
    !isMatchStatus(statusRaw) ||
    !isPlayMode(playModeRaw) ||
    !isMatchEndingKind(endingKindRaw) ||
    !isGameModeId(modeRaw)
  ) {
    return null
  }

  const playerUserIds = readStringArray(row.player_user_ids)
  const playerDisplayNames = readStringArray(row.player_display_names)
  const opponent = resolveOpponent(viewerUserId, playerUserIds, playerDisplayNames)

  return {
    id: row.id,
    status: statusRaw,
    playMode: playModeRaw,
    mode: modeRaw,
    config: readOnlineGameConfig(row.config, modeRaw),
    legsToWin: readNumber(row.legs_to_win, 1),
    endingKind: endingKindRaw,
    winnerUserId: typeof row.winner_user_id === 'string' ? row.winner_user_id : null,
    creatorUserId: readString(row.creator_user_id),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    createdAt: readString(row.created_at),
    playerUserIds,
    playerDisplayNames,
    opponentUserId: opponent.opponentUserId,
    opponentDisplayName: opponent.opponentDisplayName,
  }
}

const parseRpcRows = (data: unknown): Record<string, unknown>[] => {
  const rows = Array.isArray(data) ? data : data === null || data === undefined ? [] : [data]
  return rows.filter(isRecord)
}

export interface ListOnlineMatchSummariesOptions {
  beforeCompletedAt?: string | null
  beforeId?: string | null
  limit?: number
  completedAfter?: string | null
}

export const listMyOnlineMatchSummaries = async (
  viewerUserId: string,
  options: ListOnlineMatchSummariesOptions = {},
): Promise<OnlineMatchSummary[]> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('list_my_online_match_summaries', {
    p_before_completed_at: options.beforeCompletedAt ?? null,
    p_before_id: options.beforeId ?? null,
    p_limit: options.limit ?? HISTORY_PAGE_SIZE,
    p_completed_after: options.completedAfter ?? null,
  })

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  return parseRpcRows(result.data)
    .map((row) => mapSummaryRow(row, viewerUserId))
    .filter((row): row is OnlineMatchSummary => row !== null)
}

export const listUserOnlineMatches = async (
  viewerUserId: string,
  profileUserId: string,
  options: ListOnlineMatchSummariesOptions = {},
): Promise<OnlineMatchSummary[]> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('list_user_online_matches', {
    p_user_id: profileUserId,
    p_before_completed_at: options.beforeCompletedAt ?? null,
    p_before_id: options.beforeId ?? null,
    p_limit: options.limit ?? HISTORY_PAGE_SIZE,
  })

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  return parseRpcRows(result.data)
    .map((row) => mapSummaryRow(row, viewerUserId))
    .filter((row): row is OnlineMatchSummary => row !== null)
}

export const getMyOnlineMatchDetail = async (
  viewerUserId: string,
  matchId: string,
): Promise<OnlineMatchHistoryRow | null> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('get_my_online_match_detail', {
    p_match_id: matchId,
  })

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  const first = parseRpcRows(result.data)[0]
  if (first === undefined) {
    return null
  }

  const summary = mapSummaryRow(first, viewerUserId)
  if (summary === null) {
    return null
  }

  let session: GameSession | null = null
  if (first.session !== null && first.session !== undefined) {
    try {
      session = parseGameSession(JSON.stringify(first.session))
    } catch {
      session = null
    }
  }

  return { ...summary, session }
}

export const listMyOnlineMatchSessions = async (
  _viewerUserId: string,
  completedAfter: string | null = null,
): Promise<GameSession[]> => {
  if (supabaseClient === null) {
    throw new MatchServerApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('list_my_online_match_sessions', {
    p_completed_after: completedAfter,
  })

  if (result.error !== null) {
    throw new MatchServerApiError(result.error.message, 500, result.error.code)
  }

  const sessions: GameSession[] = []

  for (const row of parseRpcRows(result.data)) {
    if (row.session === null || row.session === undefined) {
      continue
    }

    try {
      sessions.push(parseGameSession(JSON.stringify(row.session)))
    } catch {
      // Skip malformed stored sessions.
    }
  }

  return sessions
}

/** @deprecated Prefer listMyOnlineMatchSummaries / listMyOnlineMatchSessions. */
export const listMyOnlineMatchHistory = async (
  viewerUserId: string,
): Promise<OnlineMatchHistoryRow[]> => {
  const summaries = await listMyOnlineMatchSummaries(viewerUserId, {
    limit: HISTORY_PAGE_SIZE,
  })
  const rows: OnlineMatchHistoryRow[] = []
  for (const summary of summaries) {
    rows.push({
      id: summary.id,
      status: summary.status,
      playMode: summary.playMode,
      mode: summary.mode,
      config: summary.config,
      legsToWin: summary.legsToWin,
      endingKind: summary.endingKind,
      winnerUserId: summary.winnerUserId,
      creatorUserId: summary.creatorUserId,
      completedAt: summary.completedAt,
      createdAt: summary.createdAt,
      playerUserIds: summary.playerUserIds,
      playerDisplayNames: summary.playerDisplayNames,
      opponentUserId: summary.opponentUserId,
      opponentDisplayName: summary.opponentDisplayName,
      session: null,
    })
  }
  return rows
}

export const isPublicMatchState = (value: unknown): value is PublicMatchState => {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.matchId === 'string' && typeof value.status === 'string'
}
