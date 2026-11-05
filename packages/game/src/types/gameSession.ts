import type { GameConfig, GameModeId, GameStatus } from './gameMode.ts'
import type { MatchProgress } from './match.ts'
import type { Player } from './player.ts'
import type { Visit } from './visit.ts'

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
