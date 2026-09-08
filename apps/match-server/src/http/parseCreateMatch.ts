import { GameModeId } from '@open-darts/game/types/gameMode'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import type { X01Config } from '@open-darts/game/types/x01'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { isJsonObject, isRecord } from '../json'
import type { StartingPlayerSlot } from '../match/types'
import { STARTING_PLAYER_SLOT_RANDOM } from '../match/types'
import { isV1OnlineMatchSetup } from '../match/v1Rules'

export interface CreateMatchRequest {
  mode: GameModeId
  config: X01Config
  legsToWin: number
  startingPlayerSlot: StartingPlayerSlot
}

const isStartingPlayerSlot = (value: unknown): value is StartingPlayerSlot =>
  value === 0 || value === 1 || value === STARTING_PLAYER_SLOT_RANDOM

export const parseCreateMatchRequest = (value: unknown): CreateMatchRequest | null => {
  if (!isRecord(value) || !isJsonObject(value.config)) {
    return null
  }

  if (typeof value.mode !== 'string' || !isV1OnlineMatchSetup(value.mode, value.config)) {
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

  return {
    mode: GameModeId.X01,
    config: defaultX01Config(),
    legsToWin: value.legsToWin,
    startingPlayerSlot: value.startingPlayerSlot,
  }
}
