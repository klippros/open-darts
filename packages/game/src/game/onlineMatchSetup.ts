import type { BullRunConfig } from '../types/bullRun'
import type { ClaimTheBoardConfig } from '../types/claimTheBoard'
import type { HunterConfig } from '../types/hunter'
import { GameModeId } from '../types/gameMode'
import type { GameConfig } from '../types/gameMode'
import type { X01Config } from '../types/x01'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { defaultX01Config } from '../x01/x01Presets'
import { parseAroundTheClockAimModeValue } from '../aroundTheClock/aroundTheClockConfig'
import { clampBullRunTargetScore, DEFAULT_BULL_RUN_CONFIG } from '../bullRun/bullRunConfig'
import { DEFAULT_HUNTER_CONFIG } from '../hunter/hunterConfig'

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard
const hunterMode: string = GameModeId.Hunter
const bullRunMode: string = GameModeId.BullRun

export type OnlineMatchMode =
  GameModeId.X01 | GameModeId.ClaimTheBoard | GameModeId.Hunter | GameModeId.BullRun

export type OnlineMatchConfig = X01Config | ClaimTheBoardConfig | HunterConfig | BullRunConfig

export const ONLINE_MATCH_MODES = [
  GameModeId.X01,
  GameModeId.ClaimTheBoard,
  GameModeId.Hunter,
  GameModeId.BullRun,
] as const satisfies readonly OnlineMatchMode[]

export const isOnlineMatchMode = (mode: string): mode is OnlineMatchMode =>
  (ONLINE_MATCH_MODES as readonly string[]).includes(mode)

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

export const isOnlineBullRunSetup = (mode: string, config: object): boolean => {
  if (mode !== bullRunMode) {
    return false
  }

  const targetScore = configField(config, 'targetScore')

  return typeof targetScore === 'number' && Number.isInteger(targetScore)
}

/** Allowed online match setups (sync play). Async is X01 and Bull Run. */
export const isAllowedOnlineMatchSetup = (mode: string, config: object): boolean =>
  isV1OnlineX01Setup(mode, config) ||
  isOnlineClaimTheBoardSetup(mode, config) ||
  isOnlineHunterSetup(mode, config) ||
  isOnlineBullRunSetup(mode, config)

export const supportsOnlineAsyncPlay = (mode: string): boolean =>
  mode === x01Mode || mode === bullRunMode

/** Race modes can rewrite an earlier visit after the opponent replies; shared-position modes cannot. */
export const supportsOnlineVisitCorrection = (mode: string): boolean =>
  mode === x01Mode || mode === bullRunMode

const parseStartingPlayerIndex = (value: unknown): number => (value === 1 ? 1 : 0)

/**
 * Canonical config for a validated online create-match body.
 * X01 is always the default 501 DO preset; Claim the Board keeps only aimMode;
 * Hunter keeps startingPlayerIndex (default 0; resolved slot may overwrite at start);
 * Bull Run keeps a clamped targetScore.
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

  if (mode === bullRunMode) {
    const targetScore = configField(config, 'targetScore')

    if (typeof targetScore !== 'number' || !Number.isInteger(targetScore)) {
      return null
    }

    return {
      targetScore: clampBullRunTargetScore(targetScore),
    } satisfies BullRunConfig
  }

  return null
}

export const defaultOnlineGameConfigForMode = (
  mode: OnlineMatchMode | string,
): OnlineMatchConfig => {
  if (mode === claimTheBoardMode) {
    return { aimMode: AroundTheClockAimMode.Any } satisfies ClaimTheBoardConfig
  }

  if (mode === hunterMode) {
    return DEFAULT_HUNTER_CONFIG
  }

  if (mode === bullRunMode) {
    return DEFAULT_BULL_RUN_CONFIG
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

  if (mode === bullRunMode) {
    if (!isConfigRecord(value) || typeof value.targetScore !== 'number') {
      return defaultOnlineGameConfigForMode(mode)
    }

    return {
      targetScore: clampBullRunTargetScore(value.targetScore),
    } satisfies BullRunConfig
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
