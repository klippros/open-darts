import type { GameSession } from '../../types/gameSession'
import { VisitInputMode } from '../../types/visit'
import type { GameEngine } from './GameEngine'
import { getVisitsForLeg } from './matchLegs'

export const rebuildEngineStateFromSession = <State, Config>(
  session: GameSession,
  engine: GameEngine<State, Config>,
): State => {
  const legVisits =
    session.matchProgress === undefined
      ? session.visits
      : getVisitsForLeg(session.visits, session.matchProgress.currentLeg)

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- session config matches engine config for the active mode
  let state = engine.createInitialState(session.players, session.config as Config)

  for (const visit of legVisits) {
    if (visit.inputMode === VisitInputMode.VisitScore) {
      const commitVisitScore = engine.commitVisitScore

      if (commitVisitScore === undefined) {
        throw new Error(`Engine for mode ${engine.mode} does not support visit-score input`)
      }

      const scoreToReplay = visit.bust ? visit.scoreBefore + 1 : visit.visitScore
      const { state: nextState } = commitVisitScore(
        state,
        visit.playerId,
        visit.visitIndex,
        scoreToReplay,
      )
      state = nextState
      continue
    }

    const { state: nextState } = engine.commitVisit(
      state,
      visit.playerId,
      visit.visitIndex,
      visit.darts,
    )
    state = nextState
  }

  return state
}
