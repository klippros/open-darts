import type { GameSession } from '../types/gameSession'
import { getCountingVisits } from '../types/visit'

/** Player who threw the visit that ended the match — they confirm or undo. */
export const resolvePendingFinishPlayerId = (session: GameSession): string | null => {
  const lastVisit = getCountingVisits(session.visits).at(-1)

  return lastVisit?.playerId ?? null
}
