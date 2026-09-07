import { GameModeId } from '@open-darts/game/types/gameMode'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import type { X01Config } from '@open-darts/game/types/x01'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { isJsonObject, isRecord } from '../json'
import { isV1OnlineMatchSetup } from '../match/v1Rules'

export interface CreateMatchRequest {
  mode: GameModeId
  config: X01Config
  legsToWin: number
  startingPlayerSlot: 0 | 1
}

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

  if (value.startingPlayerSlot !== 0 && value.startingPlayerSlot !== 1) {
    return null
  }

  return {
    mode: GameModeId.X01,
    config: defaultX01Config(),
    legsToWin: value.legsToWin,
    startingPlayerSlot: value.startingPlayerSlot,
  }
}
