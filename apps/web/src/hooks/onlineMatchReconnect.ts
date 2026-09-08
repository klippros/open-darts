import { MatchStatus } from '../lib/matchServer/types'

/** Server closes sockets with this reason after broadcasting a terminal state. */
export const MATCH_ENDED_CLOSE_REASON = 'match ended'

/** Server closes a player's sockets after kick / leave waiting. */
export const MATCH_LEFT_CLOSE_CODE = 4000

export const isTerminalMatchStatus = (status: MatchStatus | null | undefined): boolean =>
  status === MatchStatus.Completed || status === MatchStatus.Cancelled

/**
 * Whether the client should schedule another WebSocket connect after a close.
 * Completed/cancelled matches intentionally close the socket; reconnecting just
 * gets accepted and closed again in a loop.
 */
export const shouldAttemptMatchReconnect = (
  closeCode: number,
  closeReason: string,
  matchStatus: MatchStatus | null | undefined,
): boolean => {
  if (isTerminalMatchStatus(matchStatus)) {
    return false
  }

  if (closeReason === MATCH_ENDED_CLOSE_REASON || closeCode === MATCH_LEFT_CLOSE_CODE) {
    return false
  }

  return true
}
