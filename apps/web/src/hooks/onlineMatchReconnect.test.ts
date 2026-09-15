import { describe, expect, it } from 'vitest'
import { MatchStatus } from '../lib/matchServer/types'
import {
  MATCH_ENDED_CLOSE_REASON,
  MATCH_LEFT_CLOSE_CODE,
  shouldAttemptMatchReconnect,
} from './onlineMatchReconnect'

describe('shouldAttemptMatchReconnect', () => {
  it('reconnects on unexpected disconnects while the match is still live', () => {
    expect(shouldAttemptMatchReconnect(1006, '', MatchStatus.Active)).toBe(true)
    expect(shouldAttemptMatchReconnect(1006, '', MatchStatus.Waiting)).toBe(true)
    expect(shouldAttemptMatchReconnect(1006, '', null)).toBe(true)
  })

  it('does not reconnect after a completed or cancelled match', () => {
    expect(shouldAttemptMatchReconnect(1006, '', MatchStatus.Completed)).toBe(false)
    expect(shouldAttemptMatchReconnect(1000, '', MatchStatus.Cancelled)).toBe(false)
  })

  it('does not reconnect when the server closes the match cleanly', () => {
    expect(shouldAttemptMatchReconnect(1000, MATCH_ENDED_CLOSE_REASON, null)).toBe(false)
    expect(shouldAttemptMatchReconnect(1000, MATCH_ENDED_CLOSE_REASON, MatchStatus.Active)).toBe(
      false,
    )
  })

  it('does not reconnect after the player was kicked or left', () => {
    expect(shouldAttemptMatchReconnect(MATCH_LEFT_CLOSE_CODE, 'left', MatchStatus.Waiting)).toBe(
      false,
    )
  })
})
