export enum AroundTheClockAimMode {
  Singles = 'singles',
  Doubles = 'doubles',
  Trebles = 'trebles',
  Any = 'any',
}

export interface AroundTheClockConfig {
  finishOnBull: boolean
  aimMode?: AroundTheClockAimMode
}

export interface AroundTheClockPlayerState {
  targetIndex: number
}

export interface AroundTheClockState {
  config: AroundTheClockConfig
  players: Record<string, AroundTheClockPlayerState>
  winnerId?: string
}
