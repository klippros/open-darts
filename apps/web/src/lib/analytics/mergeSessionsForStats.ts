import type { GameSession } from '@open-darts/game/types/gameSession'

/** Local sessions win on id collision so online never overwrites a local save. */
export const mergeSessionsForStats = (
  localSessions: readonly GameSession[],
  onlineSessions: readonly GameSession[],
): GameSession[] => {
  const byId = new Map<string, GameSession>()

  for (const session of onlineSessions) {
    byId.set(session.id, session)
  }

  for (const session of localSessions) {
    byId.set(session.id, session)
  }

  return [...byId.values()]
}
