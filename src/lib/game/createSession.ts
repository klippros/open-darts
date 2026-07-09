import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import { GameStatus } from '../../types/gameMode'
import type { GameConfig, GameModeId } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { GameSession } from '../../types/gameSession'
import { GameController } from './GameController'
import { getDefaultConfig, getEngine } from './gameRegistry'
import { createId } from './playerFactory'

export type AppGameController = GameController<unknown, GameConfig>

export interface CreateSessionParams {
  mode: GameModeId
  config?: GameConfig
  players: Player[]
  sessionId?: string
}

export const createGameSession = ({
  mode,
  config = getDefaultConfig(mode),
  players,
  sessionId = createId(),
}: CreateSessionParams): GameSession => ({
  id: sessionId,
  mode,
  config,
  players,
  visits: [],
  status: GameStatus.InProgress,
  startedAt: new Date().toISOString(),
})

export const createGameController = (params: CreateSessionParams): AppGameController => {
  const session = createGameSession(params)
  const engine = getEngine(session.mode)
  const engineState = engine.createInitialState(session.players, session.config)

  return new GameController(session, engine, engineState, [], 0)
}

export const restoreGameController = (snapshot: ActiveGameSnapshot): AppGameController => {
  const { session, turnIndex, pendingDarts } = snapshot
  const engine = getEngine(session.mode)
  let engineState = engine.createInitialState(session.players, session.config)

  for (const visit of session.visits) {
    const { state } = engine.commitVisit(engineState, visit.playerId, visit.visitIndex, visit.darts)
    engineState = state
  }

  return new GameController(session, engine, engineState, pendingDarts, turnIndex)
}
