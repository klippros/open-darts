import { AroundTheClockAimMode } from '../types/aroundTheClock'
import type { ClaimTheBoardConfig } from '../types/claimTheBoard'
import { GameModeId } from '../types/gameMode'
import type { GameConfig } from '../types/gameMode'
import { defaultX01Config } from '../x01/x01Presets'
import { parseAroundTheClockAimModeValue } from '../aroundTheClock/aroundTheClockConfig'

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard

const configField = (config: object, key: string): unknown => Reflect.get(config, key)

export const isV1OnlineX01Setup = (mode: string, config: object): boolean =>
  mode === x01Mode &&
  configField(config, 'startScore') === 501 &&
  configField(config, 'doubleIn') === false &&
  configField(config, 'doubleOut') === true

export const isOnlineClaimTheBoardSetup = (mode: string, config: object): boolean =>
  mode === claimTheBoardMode &&
  parseAroundTheClockAimModeValue(configField(config, 'aimMode')) !== null

/** Allowed online match setups (sync play). Async remains X01-only. */
export const isAllowedOnlineMatchSetup = (mode: string, config: object): boolean =>
  isV1OnlineX01Setup(mode, config) || isOnlineClaimTheBoardSetup(mode, config)

export const supportsOnlineAsyncPlay = (mode: string): boolean => mode === x01Mode

/**
 * Canonical config for a validated online create-match body.
 * X01 is always the default 501 DO preset; Claim the Board keeps only aimMode.
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

  return null
}

export const defaultOnlineGameConfigForMode = (mode: string): GameConfig => {
  if (mode === claimTheBoardMode) {
    return { aimMode: AroundTheClockAimMode.Any } satisfies ClaimTheBoardConfig
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

  if (!isConfigRecord(value) || typeof value.startScore !== 'number') {
    return defaultOnlineGameConfigForMode(mode)
  }

  return {
    startScore: value.startScore,
    doubleIn: value.doubleIn === true,
    doubleOut: value.doubleOut !== false,
  }
}
