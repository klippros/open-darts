import type { PlayerProfileStats } from '@open-darts/analytics'
import { HISTORY_PAGE_SIZE } from '../history/historyPager'
import { listUserOnlineMatches, getMyOnlineMatchDetail } from '../matchServer/api'
import type { ListOnlineMatchSummariesOptions } from '../matchServer/api'
import type { OnlineMatchHistoryRow, OnlineMatchSummary } from '../matchServer/types'
import { parseRequireMutualFollowPreference } from '../social/invitePrivacyPreference'
import { supabaseClient } from '../supabase/client'
import { readEnvironmentVariable } from '../env'
import { parsePlayerProfileStats } from './parseProfileStats'

export class ProfileApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ProfileApiError'
    this.status = status
    this.code = code
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const isProfileUserId = (value: string): boolean => UUID_PATTERN.test(value)

export const fetchPlayerProfileStats = async (userId: string): Promise<PlayerProfileStats> => {
  if (supabaseClient === null) {
    throw new ProfileApiError('Supabase is not configured', 503, 'not_configured')
  }

  if (!isProfileUserId(userId)) {
    throw new ProfileApiError('Invalid user id', 400, 'bad_request')
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession()

  if (session === null) {
    throw new ProfileApiError('Sign in required', 401, 'unauthorized')
  }

  const supabaseUrl = readEnvironmentVariable(import.meta.env.VITE_SUPABASE_URL)
  const anonKey = readEnvironmentVariable(import.meta.env.VITE_SUPABASE_ANON_KEY)

  if (supabaseUrl === undefined || anonKey === undefined) {
    throw new ProfileApiError('Supabase is not configured', 503, 'not_configured')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/player-profile-stats`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (response.status === 404) {
    throw new ProfileApiError('Player not found', 404, 'not_found')
  }

  if (response.status === 429) {
    throw new ProfileApiError('Too many requests', 429, 'rate_limited')
  }

  if (response.status === 401) {
    throw new ProfileApiError('Sign in required', 401, 'unauthorized')
  }

  if (!response.ok) {
    throw new ProfileApiError('Could not load profile stats', response.status, 'server_error')
  }

  const payload: unknown = await response.json()
  const stats = parsePlayerProfileStats(payload)
  if (stats === null) {
    throw new ProfileApiError('Invalid profile response', 500, 'server_error')
  }

  return stats
}

export const listProfileOnlineMatches = (
  viewerUserId: string,
  profileUserId: string,
  options: ListOnlineMatchSummariesOptions = {},
): Promise<OnlineMatchSummary[]> =>
  listUserOnlineMatches(viewerUserId, profileUserId, {
    limit: options.limit ?? HISTORY_PAGE_SIZE,
    beforeCompletedAt: options.beforeCompletedAt,
    beforeId: options.beforeId,
  })

export const openProfileMatchDetail = (
  viewerUserId: string,
  matchId: string,
): Promise<OnlineMatchHistoryRow | null> => getMyOnlineMatchDetail(viewerUserId, matchId)

export const DISPLAY_NAME_MAX_LENGTH = 30

export type DisplayNameUpdateError = 'length' | 'chars' | 'blocked' | 'unknown'

export const updateDisplayName = async (
  displayName: string,
): Promise<DisplayNameUpdateError | null> => {
  if (supabaseClient === null) {
    return 'unknown'
  }

  const trimmed = displayName.trim().replace(/\s+/gu, ' ')
  if (trimmed.length < 1 || trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return 'length'
  }

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (user === null) {
    return 'unknown'
  }

  const { error } = await supabaseClient
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('user_id', user.id)

  if (error === null) {
    return null
  }

  const message = error.message ?? ''
  if (message.includes('DISPLAY_NAME_CHARS')) {
    return 'chars'
  }
  if (message.includes('DISPLAY_NAME_BLOCKED')) {
    return 'blocked'
  }
  if (message.includes('DISPLAY_NAME_LENGTH')) {
    return 'length'
  }

  return 'unknown'
}

export const reportDisplayName = async (reportedUserId: string): Promise<boolean> => {
  if (supabaseClient === null) {
    return false
  }

  const { error } = await supabaseClient.rpc('report_display_name', {
    p_reported_user_id: reportedUserId,
  })

  return error === null
}

export const getMyRequireMutualFollowForInvites = async (): Promise<boolean> => {
  if (supabaseClient === null) {
    return parseRequireMutualFollowPreference(undefined)
  }

  const result = await supabaseClient.rpc('get_my_require_mutual_follow_for_invites')

  if (result.error !== null) {
    return parseRequireMutualFollowPreference(undefined)
  }

  return parseRequireMutualFollowPreference(result.data as unknown)
}

export const setMyRequireMutualFollowForInvites = async (enabled: boolean): Promise<boolean> => {
  if (supabaseClient === null) {
    throw new ProfileApiError('Supabase is not configured', 503, 'not_configured')
  }

  const result = await supabaseClient.rpc('set_my_require_mutual_follow_for_invites', {
    p_enabled: enabled,
  })

  if (result.error !== null) {
    throw new ProfileApiError('Could not update invite privacy', 500, 'server_error')
  }

  return parseRequireMutualFollowPreference(result.data as unknown)
}
