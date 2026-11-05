import type { CheckoutRules } from '../types/checkout.ts'
import { GameModeId } from '../types/gameMode.ts'
import type { GameConfig } from '../types/gameMode.ts'
import type { AroundTheClockConfig } from '../types/aroundTheClock.ts'
import type { BullRunConfig } from '../types/bullRun.ts'
import type { ClaimTheBoardConfig } from '../types/claimTheBoard.ts'
import type { HunterConfig } from '../types/hunter.ts'
import type { NinetyNineDartsConfig } from '../types/ninetyNineDarts.ts'
import type { OneTwentyOneConfig } from '../types/oneTwentyOne.ts'
import type { TenUpOneDownConfig } from '../types/tenUpOneDown.ts'
import type { X01Config } from '../types/x01.ts'

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

export const isAroundTheClockConfig = (
  mode: GameModeId,
  _config: GameConfig,
): _config is AroundTheClockConfig => mode === GameModeId.AroundTheClock

export const isClaimTheBoardConfig = (
  mode: GameModeId,
  _config: GameConfig,
): _config is ClaimTheBoardConfig => mode === GameModeId.ClaimTheBoard

export const isNinetyNineDartsConfig = (
  mode: GameModeId,
  _config: GameConfig,
): _config is NinetyNineDartsConfig => mode === GameModeId.NinetyNineDarts

export const isHunterConfig = (mode: GameModeId, _config: GameConfig): _config is HunterConfig =>
  mode === GameModeId.Hunter

export const isBullRunConfig = (mode: GameModeId, _config: GameConfig): _config is BullRunConfig =>
  mode === GameModeId.BullRun

export const toCheckoutSuggestionRules = (
  mode: GameModeId,
  config: GameConfig,
): CheckoutRules | null => {
  if (isX01Config(mode, config)) {
    return {
      doubleIn: config.doubleIn,
      doubleOut: config.doubleOut,
    }
  }

  if (isOneTwentyOneConfig(mode, config)) {
    return {
      doubleIn: false,
      doubleOut: config.doubleOut,
    }
  }

  if (isTenUpOneDownConfig(mode, config)) {
    return {
      doubleIn: false,
      doubleOut: config.doubleOut,
    }
  }

  return null
}
