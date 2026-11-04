import { STARTING_PLAYER_INDEX_RANDOM } from '@open-darts/game/game/matchLegs'
import type { X01Config } from '@open-darts/game/types/x01'
import { x01ConfigsMatch, x01PresetConfigs, X01PresetId } from '@open-darts/game/x01/x01Presets'
import { MatchPlayerSlot } from './types'

export const ONLINE_PLAY_QUERY_VALUE = 'online'
export const ONLINE_PLAY_QUERY_KEY = 'play'

const ONLINE_X01_PRESET_IDS = [X01PresetId.FiveOhOne, X01PresetId.OneSeventy] as const

export const isOnlineCapableX01Config = (config: X01Config): boolean =>
  ONLINE_X01_PRESET_IDS.some((presetId) => x01ConfigsMatch(config, x01PresetConfigs[presetId]))

export const isOnlinePlaySelected = (params: URLSearchParams): boolean =>
  params.get(ONLINE_PLAY_QUERY_KEY) === ONLINE_PLAY_QUERY_VALUE

export const buildOnlineSetupPath = (basePath: string): string => {
  const url = new URL(basePath, 'https://open-darts.local')
  url.searchParams.set(ONLINE_PLAY_QUERY_KEY, ONLINE_PLAY_QUERY_VALUE)
  return `${url.pathname}${url.search}`
}

export const startingPlayerIndexToMatchSlot = (startingPlayerIndex: number): MatchPlayerSlot => {
  if (startingPlayerIndex === STARTING_PLAYER_INDEX_RANDOM) {
    return MatchPlayerSlot.Random
  }

  if (startingPlayerIndex === 0) {
    return MatchPlayerSlot.Creator
  }

  return MatchPlayerSlot.Joiner
}
