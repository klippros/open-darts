import type { ClaimTheBoardConfig } from '../types/claimTheBoard'
import type { HunterConfig } from '../types/hunter'
import { GameModeId } from '../types/gameMode'
import type { GameConfig } from '../types/gameMode'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { defaultX01Config } from '../x01/x01Presets'
import { parseAroundTheClockAimModeValue } from '../aroundTheClock/aroundTheClockConfig'
import { DEFAULT_HUNTER_CONFIG } from '../hunter/hunterConfig'

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard
const hunterMode: string = GameModeId.Hunter

const configField = (config: object, key: string): unknown => Reflect.get(config, key)

export const isV1OnlineX01Setup = (mode: string, config: object): boolean =>
  mode === x01Mode &&
  configField(config, 'startScore') === 501 &&
  configField(config, 'doubleIn') === false &&
  configField(config, 'doubleOut') === true

export const isOnlineClaimTheBoardSetup = (mode: string, config: object): boolean =>
  mode === claimTheBoardMode &&
  parseAroundTheClockAimModeValue(configField(config, 'aimMode')) !== null

export const isOnlineHunterSetup = (mode: string, _config: object): boolean => mode === hunterMode

/** Allowed online match setups (sync play). Async remains X01-only. */
export const isAllowedOnlineMatchSetup = (mode: string, config: object): boolean =>
  isV1OnlineX01Setup(mode, config) ||
  isOnlineClaimTheBoardSetup(mode, config) ||
  isOnlineHunterSetup(mode, config)

export const supportsOnlineAsyncPlay = (mode: string): boolean => mode === x01Mode

const parseStartingPlayerIndex = (value: unknown): number => (value === 1 ? 1 : 0)

/**
 * Canonical config for a validated online create-match body.
 * X01 is always the default 501 DO preset; Claim the Board keeps only aimMode;
 * Hunter keeps startingPlayerIndex (default 0; resolved slot may overwrite at start).
 */
export const canonicalizeOnlineMatchConfig = (mode: string, config: object): GameConfig | null => {
  if (isV1OnlineX01Setup(mode, config)) {
    return defaultX01Config()
  }

  if (mode === claimTheBoardMode) {
    const aimMode = parseAroundTheClockAimModeValue(configField(config, 'aimMode'))

    if (aimMode === null) {
      return null
    }

    return { aimMode } satisfies ClaimTheBoardConfig
  }

  if (mode === hunterMode) {
    return {
      startingPlayerIndex: parseStartingPlayerIndex(configField(config, 'startingPlayerIndex')),
    } satisfies HunterConfig
  }

  return null
}

export const defaultOnlineGameConfigForMode = (mode: string): GameConfig => {
  if (mode === claimTheBoardMode) {
    return { aimMode: AroundTheClockAimMode.Any } satisfies ClaimTheBoardConfig
  }

  if (mode === hunterMode) {
    return DEFAULT_HUNTER_CONFIG
  }

  return defaultX01Config()
}

const isConfigRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Parse stored online match config using the match mode — never infer mode from config shape. */
export const readOnlineGameConfig = (value: unknown, mode: string): GameConfig => {
  if (mode === claimTheBoardMode) {
    if (!isConfigRecord(value)) {
      return defaultOnlineGameConfigForMode(mode)
    }

    const aimMode = parseAroundTheClockAimModeValue(value.aimMode) ?? AroundTheClockAimMode.Any

    return { aimMode } satisfies ClaimTheBoardConfig
  }

  if (mode === hunterMode) {
    if (!isConfigRecord(value)) {
      return defaultOnlineGameConfigForMode(mode)
    }

    return {
      startingPlayerIndex: parseStartingPlayerIndex(value.startingPlayerIndex),
    } satisfies HunterConfig
  }

  if (!isConfigRecord(value) || typeof value.startScore !== 'number') {
    return defaultOnlineGameConfigForMode(mode)
  }

  return {
    startScore: value.startScore,
    doubleIn: value.doubleIn === true,
    doubleOut: value.doubleOut !== false,
  }
}

/** Apply the resolved starting slot onto Hunter config when an online match begins. */
export const withHunterStartingPlayerIndex = (
  mode: string,
  config: GameConfig,
  startingPlayerIndex: number,
): GameConfig => {
  if (mode !== hunterMode) {
    return config
  }

  return {
    startingPlayerIndex: startingPlayerIndex === 1 ? 1 : 0,
  } satisfies HunterConfig
}
