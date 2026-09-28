import { describe, expect, it } from 'vitest'
import { STARTING_PLAYER_INDEX_RANDOM } from '@open-darts/game/game/matchLegs'
import { buildX01PresetPath, X01PresetId } from '@open-darts/game/x01/x01Presets'
import { MatchPlayerSlot, V1_ONLINE_X01_CONFIG } from './types'
import {
  buildOnlineSetupPath,
  isOnlineCapableX01Config,
  isOnlinePlaySelected,
  ONLINE_PLAY_QUERY_KEY,
  ONLINE_PLAY_QUERY_VALUE,
  startingPlayerIndexToMatchSlot,
} from './onlineSetup'

describe('onlineSetup', () => {
  it('detects the fixed online 501 config and rejects other x01 configs', () => {
    expect(isOnlineCapableX01Config(V1_ONLINE_X01_CONFIG)).toBe(true)
    expect(
      isOnlineCapableX01Config({
        startScore: 401,
        doubleIn: false,
        doubleOut: true,
      }),
    ).toBe(false)
    expect(
      isOnlineCapableX01Config({
        startScore: 501,
        doubleIn: true,
        doubleOut: true,
      }),
    ).toBe(false)
  })

  it('parses play=online from search params', () => {
    expect(isOnlinePlaySelected(new URLSearchParams('play=online'))).toBe(true)
    expect(isOnlinePlaySelected(new URLSearchParams('play=guest'))).toBe(false)
    expect(isOnlinePlaySelected(new URLSearchParams())).toBe(false)
  })

  it('builds setup paths with play=online while preserving existing query params', () => {
    expect(buildOnlineSetupPath('/game/claim-the-board/setup')).toBe(
      `/game/claim-the-board/setup?${ONLINE_PLAY_QUERY_KEY}=${ONLINE_PLAY_QUERY_VALUE}`,
    )
    expect(buildOnlineSetupPath(buildX01PresetPath(X01PresetId.FiveOhOne))).toBe(
      `/game/match-setup?preset=501&${ONLINE_PLAY_QUERY_KEY}=${ONLINE_PLAY_QUERY_VALUE}`,
    )
  })

  it('maps starting player indexes to match slots', () => {
    expect(startingPlayerIndexToMatchSlot(STARTING_PLAYER_INDEX_RANDOM)).toBe(
      MatchPlayerSlot.Random,
    )
    expect(startingPlayerIndexToMatchSlot(0)).toBe(MatchPlayerSlot.Creator)
    expect(startingPlayerIndexToMatchSlot(1)).toBe(MatchPlayerSlot.Joiner)
  })
})
