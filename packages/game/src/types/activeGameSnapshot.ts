import type { DartThrow } from './dart'
import type { GameSession } from './gameSession'

export interface ActiveGameSnapshot {
  session: GameSession
  turnIndex: number
  pendingDarts: DartThrow[]
  savedAt: string
}
