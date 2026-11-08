import type { AroundTheClockAimMode } from './aroundTheClock.ts'

export interface ClaimTheBoardConfig {
  aimMode: AroundTheClockAimMode
}

export interface ClaimTheBoardPlayerState {
  score: number
}

export interface ClaimTheBoardState {
  config: ClaimTheBoardConfig
  sharedTargetIndex: number
  players: Record<string, ClaimTheBoardPlayerState>
  winnerId?: string
}
