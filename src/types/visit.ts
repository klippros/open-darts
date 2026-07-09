import type { DartThrow } from './dart'

export interface Visit {
  visitIndex: number
  playerId: string
  darts: DartThrow[]
  visitScore: number
  scoreBefore: number
  scoreAfter: number
  bust: boolean
  checkout: boolean
  metadata?: Record<string, unknown>
}
