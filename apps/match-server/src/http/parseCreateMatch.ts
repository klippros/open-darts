import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import { canonicalizeOnlineMatchConfig } from '@open-darts/game/game/onlineMatchSetup'
import { isJsonObject, isRecord } from '../json'
import type { StartingPlayerSlot } from '../match/types'
import { STARTING_PLAYER_SLOT_RANDOM } from '../match/types'

export interface CreateMatchRequest {
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: StartingPlayerSlot
}

const x01Mode: string = GameModeId.X01
const claimTheBoardMode: string = GameModeId.ClaimTheBoard

const isStartingPlayerSlot = (value: unknown): value is StartingPlayerSlot =>
  value === 0 || value === 1 || value === STARTING_PLAYER_SLOT_RANDOM

export const parseCreateMatchRequest = (value: unknown): CreateMatchRequest | null => {
  if (!isRecord(value) || !isJsonObject(value.config) || typeof value.mode !== 'string') {
    return null
  }

  const config = canonicalizeOnlineMatchConfig(value.mode, value.config)

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
