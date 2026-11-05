import type { DartThrow } from './dart.ts'
import type { GameSession } from './gameSession.ts'

export interface ActiveGameSnapshot {
  session: GameSession
  turnIndex: number
  pendingDarts: DartThrow[]
  savedAt: string
}
