import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'
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
    defaultConfig: x01PresetConfigs[X01PresetId.FiveOhOne],
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
