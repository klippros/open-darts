import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import {
  canonicalizeOnlineMatchConfig,
  isOnlineMatchMode,
} from '@open-darts/game/game/onlineMatchSetup'
import type { OnlineMatchMode } from '@open-darts/game/game/onlineMatchSetup'
import { isJsonObject, isRecord } from '../json'
import type { StartingPlayerSlot } from '../match/types'
import { STARTING_PLAYER_SLOT_RANDOM } from '../match/types'

export interface CreateMatchRequest {
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: StartingPlayerSlot
}

/** Modes other than X01 always create a single-leg match. */
const ONLINE_CREATE_LEGS_TO_WIN: Record<OnlineMatchMode, 'request' | 1> = {
  [GameModeId.X01]: 'request',
  [GameModeId.ClaimTheBoard]: 1,
  [GameModeId.Hunter]: 1,
  [GameModeId.BullRun]: 1,
}

const isStartingPlayerSlot = (value: unknown): value is StartingPlayerSlot =>
  value === 0 || value === 1 || value === STARTING_PLAYER_SLOT_RANDOM

export const parseCreateMatchRequest = (value: unknown): CreateMatchRequest | null => {
  if (!isRecord(value) || !isJsonObject(value.config) || typeof value.mode !== 'string') {
    return null
  }

  if (!isOnlineMatchMode(value.mode)) {
    return null
  }

  const mode = value.mode
  const config = canonicalizeOnlineMatchConfig(mode, value.config)

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

  const legsRule = ONLINE_CREATE_LEGS_TO_WIN[mode]

  return {
    mode,
    config,
    legsToWin: legsRule === 'request' ? value.legsToWin : legsRule,
    startingPlayerSlot: value.startingPlayerSlot,
  }
}
