import { GameModeId } from '@open-darts/game/types/gameMode'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { JsonObject } from '../json'

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard

const AIM_MODES = new Set<string>(Object.values(AroundTheClockAimMode))

export const isV1OnlineX01Setup = (mode: string, config: JsonObject): boolean =>
  mode === x01Mode &&
  config.startScore === 501 &&
  config.doubleIn === false &&
  config.doubleOut === true

export const isOnlineClaimTheBoardSetup = (mode: string, config: JsonObject): boolean =>
  mode === claimTheBoardMode && typeof config.aimMode === 'string' && AIM_MODES.has(config.aimMode)

/** Allowed online match setups (sync play). Async remains X01-only. */
export const isAllowedOnlineMatchSetup = (mode: string, config: JsonObject): boolean =>
  isV1OnlineX01Setup(mode, config) || isOnlineClaimTheBoardSetup(mode, config)

/** @deprecated Use isAllowedOnlineMatchSetup — kept as alias for existing imports. */
export const isV1OnlineMatchSetup = isAllowedOnlineMatchSetup

export const supportsOnlineAsyncPlay = (mode: string): boolean => mode === x01Mode
