/** Mirrors match-server ASYNC_DISCONNECT_MS / ASYNC_VISIT_STALL_MS. */
export const ASYNC_DISCONNECT_MS = 30 * 1000

export const ASYNC_VISIT_STALL_MS = 60 * 1000

export interface StartAsyncOpponentSnapshot {
  userId: string
  connected: boolean
  lastSeenAt: number | null
}

export interface StartAsyncEligibilityInput {
  nowMs: number
  matchStartedAt: number | null
  activePlayerId: string | null
  opponent: StartAsyncOpponentSnapshot | null
  players: readonly { lastVisitAt: number | null }[]
}

/** Last committed visit, or match start — approximates when the current turn began. */
export const resolveTurnAnchorMs = (
  matchStartedAt: number | null,
  players: readonly { lastVisitAt: number | null }[],
): number | null => {
  let latestVisitAt: number | null = null

  for (const player of players) {
    if (player.lastVisitAt === null) {
      continue
    }

    if (latestVisitAt === null || player.lastVisitAt > latestVisitAt) {
      latestVisitAt = player.lastVisitAt
    }
  }

  return latestVisitAt ?? matchStartedAt
}

export const canStartAsyncFromInactivity = (input: StartAsyncEligibilityInput): boolean => {
  if (input.opponent === null) {
    return false
  }

  const disconnectedLongEnough =
    !input.opponent.connected &&
    input.opponent.lastSeenAt !== null &&
    input.nowMs - input.opponent.lastSeenAt >= ASYNC_DISCONNECT_MS

  if (disconnectedLongEnough) {
    return true
  }

  if (input.activePlayerId !== input.opponent.userId) {
    return false
  }

  const turnAnchorMs = resolveTurnAnchorMs(input.matchStartedAt, input.players)

  return turnAnchorMs !== null && input.nowMs - turnAnchorMs >= ASYNC_VISIT_STALL_MS
}
