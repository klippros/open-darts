import { supabaseClient } from '../supabase/client'

export class FollowApiError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'FollowApiError'
    this.code = code
  }
}

const mapFollowError = (message: string): FollowApiError => {
  if (message.includes('rate limited')) {
    return new FollowApiError('Too many follow requests. Try again shortly.', 'rate_limited')
  }
  if (message.includes('follow limit reached')) {
    return new FollowApiError('You have reached the follow limit.', 'follow_limit')
  }
  if (message.includes('not allowed')) {
    return new FollowApiError('Unable to follow this player.', 'not_allowed')
  }
  return new FollowApiError('Unable to update follow status.', 'unknown')
}

export const isFollowingUser = async (followeeUserId: string): Promise<boolean> => {
  if (supabaseClient === null) {
    return false
  }

  const result = await supabaseClient.rpc('is_following_user', {
    p_followee_id: followeeUserId,
  })

  if (result.error !== null) {
    return false
  }

  return result.data === true
}

export const followUser = async (followeeUserId: string): Promise<void> => {
  if (supabaseClient === null) {
    throw new FollowApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('follow_user', {
    p_followee_id: followeeUserId,
  })

  if (result.error !== null) {
    throw mapFollowError(result.error.message)
  }
}

export const unfollowUser = async (followeeUserId: string): Promise<void> => {
  if (supabaseClient === null) {
    throw new FollowApiError('Supabase is not configured', 'not_configured')
  }

  const result = await supabaseClient.rpc('unfollow_user', {
    p_followee_id: followeeUserId,
  })

  if (result.error !== null) {
    throw mapFollowError(result.error.message)
  }
}
