export interface X01Config {
  startScore: number
  doubleIn: boolean
  doubleOut: boolean
}

export interface X01PlayerState {
  remaining: number
  hasOpened: boolean
}

export interface X01State {
  config: X01Config
  players: Record<string, X01PlayerState>
  winnerId?: string
}
