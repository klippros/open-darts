export interface TenUpOneDownConfig {
  startScore: number
  incrementUp: number
  decrementDown: number
  minScore: number
  doubleOut: boolean
}

export interface TenUpOneDownPlayerState {
  targetScore: number
}

export interface TenUpOneDownState {
  config: TenUpOneDownConfig
  players: Record<string, TenUpOneDownPlayerState>
  winnerId?: string
}
