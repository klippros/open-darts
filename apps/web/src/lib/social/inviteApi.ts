import type { GameConfig } from '@open-darts/game/types/gameMode'
import { supabaseClient } from '../supabase/client'
import { OnlineMatchInviteOutcome, OnlineMatchInviteStatus } from './types'
import type {
  FollowedPlayerForInvite,
  OnlineMatchInviteAccept,
  OnlineMatchInviteHostRow,
  PendingOnlineMatchInvite,
} from './types'

export class InviteApiError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'InviteApiError'
    this.code = code
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown): string | null => (typeof value === 'string' ? value : null)

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const parseInviteStatus = (value: unknown): OnlineMatchInviteStatus | null => {
  if (typeof value !== 'string') {
    return null
  }

  return (Object.values(OnlineMatchInviteStatus) as string[]).includes(value)
    ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked against enum values
      (value as OnlineMatchInviteStatus)
    : null
}

const mapInviteError = (message: string): InviteApiError => {
  if (message.includes('rate limited')) {
    return new InviteApiError('Too many invite requests. Try again later.', 'rate_limited')
  }
  if (message.includes('invite limit reached')) {
    return new InviteApiError(
      'This lobby already has the maximum number of invites.',
      'invite_limit',
    )
  }
  if (message.includes('invite inbox full')) {
    return new InviteApiError('That player already has too many pending invites.', 'inbox_full')
  }
  if (message.includes('already invited')) {
    return new InviteApiError('That player was already invited to this lobby.', 'already_invited')
  }
  if (message.includes('invite not allowed')) {
    return new InviteApiError("This player isn't accepting invites from you.", 'invite_not_allowed')
  }
  if (message.includes('not following')) {
    return new InviteApiError('You can only invite players you follow.', 'not_following')
  }
  if (message.includes('match is full') || message.includes('already seated')) {
    return new InviteApiError('This lobby is no longer open for invites.', 'match_full')
  }
  if (message.includes('invite no longer joinable') || message.includes('invite not pending')) {
    return new InviteApiError('This invite is no longer available.', 'not_joinable')
  }
  if (message.includes('not allowed') || message.includes('not authenticated')) {
    return new InviteApiError('Unable to complete that invite action.', 'not_allowed')
  }
  return new InviteApiError('Unable to complete that invite action.', 'unknown')
}

const parseFollowedPlayer = (value: unknown): FollowedPlayerForInvite | null => {
  if (!isRecord(value)) {
    return null
  }

  const userId = readString(value.user_id)
  const displayName = readString(value.display_name)
  const rank = readNumber(value.rank)
  const relevanceScore = readNumber(value.relevance_score)
  const playCount = readNumber(value.play_count)
  const rankedAt = readString(value.ranked_at)
  const lastPlayedAt = readString(value.last_played_at)

  if (
    userId === null ||
    displayName === null ||
    rank === null ||
    relevanceScore === null ||
    playCount === null ||
    rankedAt === null
  ) {
    return null
  }

  return {
    userId,
    displayName,
    rank,
    relevanceScore,
    playCount,
    lastPlayedAt,
    rankedAt,
  }
}

const parsePendingInvite = (value: unknown): PendingOnlineMatchInvite | null => {
  if (!isRecord(value)) {
    return null
  }

  const inviteId = readString(value.invite_id)
  const matchId = readString(value.match_id)
  const inviterUserId = readString(value.inviter_user_id)
  const inviterDisplayName = readString(value.inviter_display_name)
  const mode = readString(value.mode)
  const legsToWin = readNumber(value.legs_to_win)
  const createdAt = readString(value.created_at)
  const config = isRecord(value.config)
    ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- sanitized by RPC allowlist
      (value.config as unknown as GameConfig)
    : null

  if (
    inviteId === null ||
    matchId === null ||
    inviterUserId === null ||
    inviterDisplayName === null ||
    mode === null ||
    legsToWin === null ||
    createdAt === null ||
    config === null
  ) {
    return null
  }

  return {
    inviteId,
    matchId,
    inviterUserId,
    inviterDisplayName,
    mode,
    config,
    legsToWin,
    createdAt,
  }
}

const parseHostInvite = (value: unknown): OnlineMatchInviteHostRow | null => {
  if (!isRecord(value)) {
    return null
  }

  const inviteId = readString(value.invite_id)
  const inviteeUserId = readString(value.invitee_user_id)
  const inviteeDisplayName = readString(value.invitee_display_name)
  const status = parseInviteStatus(value.status)
  const createdAt = readString(value.created_at)
  const respondedAt = readString(value.responded_at)
  const resolvedAt = readString(value.resolved_at)

  if (
    inviteId === null ||
    inviteeUserId === null ||
    inviteeDisplayName === null ||
    status === null ||
    createdAt === null
  ) {
    return null
  }

  return {
    inviteId,
    inviteeUserId,
    inviteeDisplayName,
    status,
    createdAt,
    respondedAt,
    resolvedAt,
  }
}

const parseOutcome = (value: unknown): OnlineMatchInviteOutcome | null => {
  if (typeof value !== 'string') {
    return null
  }

  return (Object.values(OnlineMatchInviteOutcome) as string[]).includes(value)
    ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked against enum values
      (value as OnlineMatchInviteOutcome)
    : null
}

const parseAccept = (value: unknown): OnlineMatchInviteAccept | null => {
  if (!isRecord(value)) {
    return null
  }

  const matchId = readString(value.match_id)
  const outcome = parseOutcome(value.outcome)
  if (matchId === null || outcome === null) {
    return null
  }

  return {
    matchId,
    inviteToken: readString(value.invite_token),
    outcome,
  }
}

export interface ListFollowedPlayersOptions {
  query?: string
  limit?: number
  rankedAt?: string
  afterRelevanceScore?: number
  afterDisplayName?: string
  afterUserId?: string
}

export const listFollowedPlayersForInvite = async (
  options: ListFollowedPlayersOptions = {},
): Promise<FollowedPlayerForInvite[]> => {
  if (supabaseClient === null) {
    throw new InviteApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('list_followed_players_for_invite', {
    p_query: options.query ?? null,
    p_limit: options.limit ?? 50,
    p_ranked_at: options.rankedAt ?? null,
    p_after_relevance_score: options.afterRelevanceScore ?? null,
    p_after_display_name: options.afterDisplayName ?? null,
    p_after_user_id: options.afterUserId ?? null,
  })

  if (result.error !== null) {
    throw mapInviteError(result.error.message)
  }

  if (!Array.isArray(result.data)) {
    return []
  }

  return result.data.flatMap((row: unknown) => {
    const parsed = parseFollowedPlayer(row)
    return parsed === null ? [] : [parsed]
  })
}

export const createOnlineMatchInvite = async (
  matchId: string,
  inviteeUserId: string,
): Promise<OnlineMatchInviteHostRow> => {
  if (supabaseClient === null) {
    throw new InviteApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('create_online_match_invite', {
    p_match_id: matchId,
    p_invitee_id: inviteeUserId,
  })

  if (result.error !== null) {
    throw mapInviteError(result.error.message)
  }

  const raw: unknown = result.data
  const payload: unknown = Array.isArray(raw) ? raw[0] : raw
  const parsed = parseHostInvite(payload)
  if (parsed === null) {
    throw new InviteApiError('Invalid invite response', 'invalid_response')
  }

  return parsed
}

export const listMyPendingOnlineMatchInvites = async (): Promise<PendingOnlineMatchInvite[]> => {
  if (supabaseClient === null) {
    return []
  }

  const result = await supabaseClient.rpc('list_my_pending_online_match_invites')

  if (result.error !== null) {
    throw mapInviteError(result.error.message)
  }

  if (!Array.isArray(result.data)) {
    return []
  }

  return result.data.flatMap((row: unknown) => {
    const parsed = parsePendingInvite(row)
    return parsed === null ? [] : [parsed]
  })
}

export const listOnlineMatchInvitesForMatch = async (
  matchId: string,
): Promise<OnlineMatchInviteHostRow[]> => {
  if (supabaseClient === null) {
    throw new InviteApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('list_online_match_invites_for_match', {
    p_match_id: matchId,
  })

  if (result.error !== null) {
    throw mapInviteError(result.error.message)
  }

  if (!Array.isArray(result.data)) {
    return []
  }

  return result.data.flatMap((row: unknown) => {
    const parsed = parseHostInvite(row)
    return parsed === null ? [] : [parsed]
  })
}

export const respondOnlineMatchInvite = async (
  inviteId: string,
  accept: boolean,
): Promise<OnlineMatchInviteAccept> => {
  if (supabaseClient === null) {
    throw new InviteApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('respond_online_match_invite', {
    p_invite_id: inviteId,
    p_accept: accept,
  })

  if (result.error !== null) {
    throw mapInviteError(result.error.message)
  }

  const raw: unknown = result.data
  const payload: unknown = Array.isArray(raw) ? raw[0] : raw
  const parsed = parseAccept(payload)
  if (parsed === null) {
    throw new InviteApiError('Invalid invite response', 'invalid_response')
  }

  return parsed
}

export const inviteStatusLabel = (status: OnlineMatchInviteStatus): string => {
  switch (status) {
    case OnlineMatchInviteStatus.Pending:
      return 'Pending'
    case OnlineMatchInviteStatus.Accepted:
      return 'Accepted'
    case OnlineMatchInviteStatus.Declined:
      return 'Declined'
    case OnlineMatchInviteStatus.Superseded:
      return 'No longer available'
    default:
      return 'Unknown'
  }
}
