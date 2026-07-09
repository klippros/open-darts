import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import type { TenUpOneDownConfig } from '../../types/tenUpOneDown'
import type { X01Config } from '../../types/x01'

export const isX01Config = (mode: GameModeId, _config: GameConfig): _config is X01Config =>
  mode === GameModeId.X01

export const isOneTwentyOneConfig = (
  mode: GameModeId,
  _config: GameConfig,
): _config is OneTwentyOneConfig => mode === GameModeId.OneTwentyOne

export const isTenUpOneDownConfig = (
  mode: GameModeId,
  _config: GameConfig,
): _config is TenUpOneDownConfig => mode === GameModeId.TenUpOneDown

export const toCheckoutSuggestionConfig = (
  mode: GameModeId,
  config: GameConfig,
): X01Config | null => {
  if (isX01Config(mode, config)) {
    return config
  }

  if (isOneTwentyOneConfig(mode, config)) {
    return {
      startScore: config.startScore,
      doubleIn: false,
      doubleOut: config.doubleOut,
    }
  }

  if (isTenUpOneDownConfig(mode, config)) {
    return {
      startScore: config.startScore,
      doubleIn: false,
      doubleOut: config.doubleOut,
    }
  }

  return null
}
