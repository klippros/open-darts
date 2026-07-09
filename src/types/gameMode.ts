import type { X01Config } from './x01'

export enum GameModeId {
  X01 = 'x01',
}

export enum GameStatus {
  InProgress = 'in-progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export type GameConfig = X01Config
