export interface Bob27Config {
  startScore: number
}

export interface Bob27PlayerState {
  score: number
  targetIndex: number
}

export interface Bob27State {
  config: Bob27Config
  players: Record<string, Bob27PlayerState>
  winnerId?: string
}
