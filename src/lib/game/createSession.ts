import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { GameSession } from '../../types/gameSession'
import type { X01Config, X01State } from '../../types/x01'
import { defaultX01Config } from '../x01/x01Presets'
import { GameController } from './GameController'
import { getDefaultConfig, getEngine } from './gameRegistry'
import { createId } from './playerFactory'

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

export const createGameController = (
  params: CreateSessionParams,
): GameController<X01State, X01Config> => {
  const session = createGameSession(params)

  if (session.mode !== GameModeId.X01) {
    throw new Error(`Unsupported game mode: ${String(session.mode)}`)
  }

  const engine = getEngine(session.mode)
  const engineState = engine.createInitialState(session.players, session.config)

  return new GameController(session, engine, engineState, [], 0)
}

export const createX01Controller = (
  players: Player[],
  config: X01Config = defaultX01Config(),
  sessionId?: string,
): GameController<X01State, X01Config> =>
  createGameController({
    mode: GameModeId.X01,
    config,
    players,
    sessionId,
  })
