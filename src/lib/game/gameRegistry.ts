import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { X01Config } from '../../types/x01'
import { x01Engine } from '../x01/x01Engine'

export interface GameModeDefinition {
  mode: GameModeId
  defaultConfig: GameConfig
  label: string
  description: string
}

export const gameModeDefinitions: Record<GameModeId, GameModeDefinition> = {
  [GameModeId.X01]: {
    mode: GameModeId.X01,
    defaultConfig: {
      startScore: 501,
      doubleIn: false,
      doubleOut: true,
    } satisfies X01Config,
    label: '501',
    description: 'Classic double-out',
  },
}

export const getEngine = (mode: GameModeId) => {
  if (mode === GameModeId.X01) {
    return x01Engine
  }

  const _exhaustive: never = mode
  throw new Error(`Unknown game mode: ${String(_exhaustive)}`)
}

export const getDefaultConfig = (mode: GameModeId): GameConfig =>
  gameModeDefinitions[mode].defaultConfig
