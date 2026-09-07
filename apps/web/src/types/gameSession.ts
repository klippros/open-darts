import type { GameConfig, GameModeId, GameStatus } from './gameMode'
import type { MatchProgress } from './match'
import type { Player } from './player'
import type { Visit } from './visit'

export interface GameSession {
  id: string
  mode: GameModeId
  config: GameConfig
  players: Player[]
  visits: Visit[]
  status: GameStatus
  startedAt: string
  completedAt?: string
  finishedEarly?: boolean
  matchProgress?: MatchProgress
}
