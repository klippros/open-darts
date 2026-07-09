export interface OneTwentyOneConfig {
  startScore: number
  increment: number
  doubleOut: boolean
}

export interface OneTwentyOnePlayerState {
  targetScore: number
}

export interface OneTwentyOneState {
  config: OneTwentyOneConfig
  players: Record<string, OneTwentyOnePlayerState>
  winnerId?: string
}
