import type { Visit } from '../types/visit'
import { getCountingVisits } from '../types/visit'
import type { AppGameController } from './createSession'

/**
 * Replays counting visits onto a solo (typically 1-player) controller.
 * Stops early if a visit is rejected so callers keep the last valid state.
 */
export const replaySoloVisits = (
  controller: AppGameController,
  visits: Visit[],
): AppGameController => {
  let current = controller

  for (const visit of getCountingVisits(visits)) {
    const next =
      visit.darts.length > 0
        ? current.recordDarts(visit.darts)
        : current.recordVisitScore(visit.visitScore)

    if (next.session.visits.length === current.session.visits.length) {
      return current
    }

    current = next
  }

  return current
}
