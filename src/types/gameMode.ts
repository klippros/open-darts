import type { AroundTheClockConfig } from './aroundTheClock'
import type { Bob27Config } from './bob27'
import type { OneTwentyOneConfig } from './oneTwentyOne'
import type { TenUpOneDownConfig } from './tenUpOneDown'
import type { X01Config } from './x01'

export enum GameModeId {
  X01 = 'x01',
  Bob27 = 'bob27',
  OneTwentyOne = '121',
  AroundTheClock = 'around-the-clock',
  TenUpOneDown = '10-up-1-down',
}

export enum GameStatus {
  InProgress = 'in-progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export type GameConfig =
  X01Config | Bob27Config | OneTwentyOneConfig | AroundTheClockConfig | TenUpOneDownConfig
