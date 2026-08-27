import type { GameSession } from '../../types/gameSession'
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
