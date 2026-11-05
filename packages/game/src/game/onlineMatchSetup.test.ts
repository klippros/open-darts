import { describe, expect, it } from 'vitest'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { GameModeId } from '../types/gameMode'
import { defaultX01Config, x01PresetConfigs, X01PresetId } from '../x01/x01Presets'
import { DEFAULT_BULL_RUN_CONFIG } from '../bullRun/bullRunConfig'
import { DEFAULT_HUNTER_CONFIG } from '../hunter/hunterConfig'
import {
  canonicalizeOnlineMatchConfig,
  isAllowedOnlineMatchSetup,
  isOnlineBullRunSetup,
  isOnlineClaimTheBoardSetup,
  isOnlineHunterSetup,
  isOnlineMatchMode,
  isV1OnlineX01Setup,
  ONLINE_MATCH_MODES,
  readOnlineGameConfig,
  supportsOnlineAsyncPlay,
  supportsOnlineVisitCorrection,
  withHunterStartingPlayerIndex,
} from './onlineMatchSetup'

describe('onlineMatchSetup', () => {
  it('accepts online X01 setups for 501 and 170 double-out only', () => {
    expect(isV1OnlineX01Setup(GameModeId.X01, defaultX01Config())).toBe(true)
    expect(isV1OnlineX01Setup(GameModeId.X01, x01PresetConfigs[X01PresetId.OneSeventy])).toBe(true)
    expect(
      isV1OnlineX01Setup(GameModeId.X01, {
        startScore: 301,
        doubleIn: false,
        doubleOut: true,
      }),
    ).toBe(false)
    expect(
      isV1OnlineX01Setup(GameModeId.X01, {
        startScore: 170,
        doubleIn: true,
        doubleOut: true,
      }),
    ).toBe(false)
    expect(isAllowedOnlineMatchSetup(GameModeId.X01, defaultX01Config())).toBe(true)
    expect(
      isAllowedOnlineMatchSetup(GameModeId.X01, x01PresetConfigs[X01PresetId.OneSeventy]),
    ).toBe(true)
  })

  it('accepts claim-the-board setups with a known aim mode', () => {
    expect(
      isOnlineClaimTheBoardSetup(GameModeId.ClaimTheBoard, {
        aimMode: AroundTheClockAimMode.Doubles,
      }),
    ).toBe(true)
    expect(isOnlineClaimTheBoardSetup(GameModeId.ClaimTheBoard, { aimMode: 'invalid' })).toBe(false)
    expect(isOnlineClaimTheBoardSetup(GameModeId.X01, { aimMode: 'any' })).toBe(false)
  })

  it('accepts hunter setups', () => {
    expect(isOnlineHunterSetup(GameModeId.Hunter, {})).toBe(true)
    expect(isAllowedOnlineMatchSetup(GameModeId.Hunter, DEFAULT_HUNTER_CONFIG)).toBe(true)
    expect(isOnlineHunterSetup(GameModeId.X01, {})).toBe(false)
  })

  it('accepts bull-run setups with an integer target', () => {
    expect(isOnlineBullRunSetup(GameModeId.BullRun, { targetScore: 15 })).toBe(true)
    expect(isAllowedOnlineMatchSetup(GameModeId.BullRun, DEFAULT_BULL_RUN_CONFIG)).toBe(true)
    expect(isOnlineBullRunSetup(GameModeId.BullRun, { targetScore: 15.5 })).toBe(false)
    expect(isOnlineBullRunSetup(GameModeId.X01, { targetScore: 15 })).toBe(false)
  })

  it('canonicalizes create-match configs', () => {
    expect(canonicalizeOnlineMatchConfig(GameModeId.X01, defaultX01Config())).toEqual(
      defaultX01Config(),
    )
    expect(
      canonicalizeOnlineMatchConfig(GameModeId.X01, x01PresetConfigs[X01PresetId.OneSeventy]),
    ).toEqual(x01PresetConfigs[X01PresetId.OneSeventy])
    expect(
      canonicalizeOnlineMatchConfig(GameModeId.X01, {
        startScore: 301,
        doubleIn: false,
        doubleOut: true,
      }),
    ).toBeNull()
    expect(
      canonicalizeOnlineMatchConfig(GameModeId.ClaimTheBoard, {
        aimMode: AroundTheClockAimMode.Trebles,
        extra: true,
      }),
    ).toEqual({ aimMode: AroundTheClockAimMode.Trebles })
    expect(canonicalizeOnlineMatchConfig(GameModeId.ClaimTheBoard, { aimMode: 'nope' })).toBeNull()
    expect(canonicalizeOnlineMatchConfig(GameModeId.Hunter, {})).toEqual({
      startingPlayerIndex: 0,
    })
    expect(canonicalizeOnlineMatchConfig(GameModeId.Hunter, { startingPlayerIndex: 1 })).toEqual({
      startingPlayerIndex: 1,
    })
    expect(canonicalizeOnlineMatchConfig(GameModeId.BullRun, { targetScore: 60 })).toEqual({
      targetScore: 50,
    })
    expect(canonicalizeOnlineMatchConfig(GameModeId.BullRun, { targetScore: '15' })).toBeNull()
  })

  it('lists online match modes', () => {
    expect(ONLINE_MATCH_MODES).toEqual([
      GameModeId.X01,
      GameModeId.ClaimTheBoard,
      GameModeId.Hunter,
      GameModeId.BullRun,
    ])
    expect(isOnlineMatchMode(GameModeId.BullRun)).toBe(true)
    expect(isOnlineMatchMode(GameModeId.NinetyNineDarts)).toBe(false)
  })

  it('allows async play for X01 and Bull Run', () => {
    expect(supportsOnlineAsyncPlay(GameModeId.X01)).toBe(true)
    expect(supportsOnlineAsyncPlay(GameModeId.BullRun)).toBe(true)
    expect(supportsOnlineAsyncPlay(GameModeId.ClaimTheBoard)).toBe(false)
    expect(supportsOnlineAsyncPlay(GameModeId.Hunter)).toBe(false)
  })

  it('allows visit correction for X01 and Bull Run', () => {
    expect(supportsOnlineVisitCorrection(GameModeId.X01)).toBe(true)
    expect(supportsOnlineVisitCorrection(GameModeId.BullRun)).toBe(true)
    expect(supportsOnlineVisitCorrection(GameModeId.ClaimTheBoard)).toBe(false)
    expect(supportsOnlineVisitCorrection(GameModeId.Hunter)).toBe(false)
  })

  it('reads stored configs by mode, not by shape', () => {
    expect(
      readOnlineGameConfig({ aimMode: AroundTheClockAimMode.Singles }, GameModeId.X01),
    ).toEqual(defaultX01Config())
    expect(
      readOnlineGameConfig(
        { startScore: 501, doubleIn: false, doubleOut: true, aimMode: 'any' },
        GameModeId.ClaimTheBoard,
      ),
    ).toEqual({ aimMode: AroundTheClockAimMode.Any })
    expect(readOnlineGameConfig(null, GameModeId.ClaimTheBoard)).toEqual({
      aimMode: AroundTheClockAimMode.Any,
    })
    expect(readOnlineGameConfig({ startingPlayerIndex: 1 }, GameModeId.Hunter)).toEqual({
      startingPlayerIndex: 1,
    })
    expect(readOnlineGameConfig(null, GameModeId.Hunter)).toEqual(DEFAULT_HUNTER_CONFIG)
    expect(readOnlineGameConfig({ targetScore: 20 }, GameModeId.BullRun)).toEqual({
      targetScore: 20,
    })
    expect(readOnlineGameConfig(null, GameModeId.BullRun)).toEqual(DEFAULT_BULL_RUN_CONFIG)
  })

  it('applies the resolved starting slot onto hunter config', () => {
    expect(withHunterStartingPlayerIndex(GameModeId.Hunter, DEFAULT_HUNTER_CONFIG, 1)).toEqual({
      startingPlayerIndex: 1,
    })
    expect(withHunterStartingPlayerIndex(GameModeId.X01, defaultX01Config(), 1)).toEqual(
      defaultX01Config(),
    )
  })
})
