import type { AroundTheClockConfig } from './aroundTheClock.ts'
import type { BullRunConfig } from './bullRun.ts'
import type { ClaimTheBoardConfig } from './claimTheBoard.ts'
import type { Bob27Config } from './bob27.ts'
import type { HunterConfig } from './hunter.ts'
import type { NinetyNineDartsConfig } from './ninetyNineDarts.ts'
import type { OneTwentyOneConfig } from './oneTwentyOne.ts'
import type { TenUpOneDownConfig } from './tenUpOneDown.ts'
import type { X01Config } from './x01.ts'

export enum GameModeId {
  X01 = 'x01',
  Bob27 = 'bob27',
  OneTwentyOne = '121',
  AroundTheClock = 'around-the-clock',
  ClaimTheBoard = 'claim-the-board',
  TenUpOneDown = '10-up-1-down',
  NinetyNineDarts = '99-darts',
  Hunter = 'hunter',
  BullRun = 'bull-run',
}

export enum GameStatus {
  InProgress = 'in-progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export type GameConfig =
  | X01Config
  | Bob27Config
  | OneTwentyOneConfig
  | AroundTheClockConfig
  | ClaimTheBoardConfig
  | TenUpOneDownConfig
  | NinetyNineDartsConfig
  | HunterConfig
  | BullRunConfig
