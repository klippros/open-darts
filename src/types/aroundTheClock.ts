export interface AroundTheClockConfig {
  finishOnBull: boolean
}

export interface AroundTheClockPlayerState {
  targetIndex: number
}

export interface AroundTheClockState {
  config: AroundTheClockConfig
  players: Record<string, AroundTheClockPlayerState>
  winnerId?: string
}
