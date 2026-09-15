export interface OneTwentyOneConfig {
  startScore: number
  increment: number
  startingLives: number
  maxVisitsPerTarget: number
  doubleOut: boolean
}

export interface OneTwentyOnePlayerState {
  roundTarget: number
  remaining: number
  lives: number
  visitsOnTarget: number
  peakTarget: number
}

export interface OneTwentyOneState {
  config: OneTwentyOneConfig
  players: Record<string, OneTwentyOnePlayerState>
  winnerId?: string
}
