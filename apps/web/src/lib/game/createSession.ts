import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import { GameStatus } from '../../types/gameMode'
import type { GameConfig, GameModeId } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { GameSession } from '../../types/gameSession'
import { GameController } from './GameController'
import { getDefaultConfig } from './gameModeDefinitions'
import { getEngine } from './gameRegistry'
import type { MatchFormat } from './matchLegs'
import { createInitialMatchProgress, getLegStartingPlayerIndex } from './matchLegs'
import { createId } from './playerFactory'
import { rebuildEngineStateFromSession } from './rebuildEngineState'

export type AppGameController = GameController<unknown, GameConfig>

export interface CreateSessionParams {
  mode: GameModeId
  config?: GameConfig
  players: Player[]
  sessionId?: string
  matchFormat?: MatchFormat
}

const createGameSession = ({
  mode,
  config = getDefaultConfig(mode),
  players,
  sessionId = createId(),
  matchFormat,
}: CreateSessionParams): GameSession => ({
  id: sessionId,
  mode,
  config,
  players,
  visits: [],
  status: GameStatus.InProgress,
  startedAt: new Date().toISOString(),
  matchProgress:
    matchFormat === undefined ? undefined : createInitialMatchProgress(players, matchFormat),
})

const getInitialTurnIndex = (session: GameSession): number => {
  const { matchProgress, players } = session

  if (matchProgress === undefined) {
    return 0
  }

  return getLegStartingPlayerIndex(
    matchProgress.startingPlayerIndex,
    matchProgress.currentLeg,
    players.length,
  )
}

export const createGameController = (params: CreateSessionParams): AppGameController => {
  const session = createGameSession(params)
  const engine = getEngine(session.mode)
  const engineState = engine.createInitialState(session.players, session.config)

  return new GameController(session, engine, engineState, [], getInitialTurnIndex(session))
}

export const restoreGameController = (snapshot: ActiveGameSnapshot): AppGameController => {
  const { session, turnIndex, pendingDarts } = snapshot
  const engine = getEngine(session.mode)
  const engineState = rebuildEngineStateFromSession(session, engine)

  return new GameController(session, engine, engineState, pendingDarts, turnIndex)
}
