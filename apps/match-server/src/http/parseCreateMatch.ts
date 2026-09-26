import { GameModeId } from '@open-darts/game/types/gameMode'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { ClaimTheBoardConfig } from '@open-darts/game/types/claimTheBoard'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { isJsonObject, isRecord } from '../json'
import type { JsonObject } from '../json'
import type { StartingPlayerSlot } from '../match/types'
import { STARTING_PLAYER_SLOT_RANDOM } from '../match/types'
import { isOnlineClaimTheBoardSetup, isV1OnlineX01Setup } from '../match/v1Rules'

export interface CreateMatchRequest {
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: StartingPlayerSlot
}

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard
const AIM_MODE_VALUES: readonly string[] = Object.values(AroundTheClockAimMode)

const isStartingPlayerSlot = (value: unknown): value is StartingPlayerSlot =>
  value === 0 || value === 1 || value === STARTING_PLAYER_SLOT_RANDOM

const parseAimMode = (value: unknown): AroundTheClockAimMode | null => {
  if (typeof value !== 'string' || !AIM_MODE_VALUES.includes(value)) {
    return null
  }

  for (const aimMode of Object.values(AroundTheClockAimMode)) {
    if ((aimMode as string) === value) {
      return aimMode
    }
  }

  return null
}

const canonicalizeConfig = (mode: string, config: JsonObject): GameConfig | null => {
  if (isV1OnlineX01Setup(mode, config)) {
    return defaultX01Config()
  }

  if (isOnlineClaimTheBoardSetup(mode, config)) {
    const aimMode = parseAimMode(config.aimMode)

    if (aimMode === null) {
      return null
    }

    return { aimMode } satisfies ClaimTheBoardConfig
  }

  return null
}

export const parseCreateMatchRequest = (value: unknown): CreateMatchRequest | null => {
  if (!isRecord(value) || !isJsonObject(value.config) || typeof value.mode !== 'string') {
    return null
  }

  const config = canonicalizeConfig(value.mode, value.config)

  if (config === null) {
    return null
  }

  if (
    typeof value.legsToWin !== 'number' ||
    !Number.isInteger(value.legsToWin) ||
    value.legsToWin < LEGS_TO_WIN_MIN ||
    value.legsToWin > LEGS_TO_WIN_MAX
  ) {
    return null
  }

  if (!isStartingPlayerSlot(value.startingPlayerSlot)) {
    return null
  }

  if (value.mode === x01Mode) {
    return {
      mode: GameModeId.X01,
      config,
      legsToWin: value.legsToWin,
      startingPlayerSlot: value.startingPlayerSlot,
    }
  }

  if (value.mode === claimTheBoardMode) {
    return {
      mode: GameModeId.ClaimTheBoard,
      config,
      legsToWin: 1,
      startingPlayerSlot: value.startingPlayerSlot,
    }
  }

  return null
}
