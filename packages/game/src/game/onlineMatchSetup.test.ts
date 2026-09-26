import { describe, expect, it } from 'vitest'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { GameModeId } from '../types/gameMode'
import { defaultX01Config } from '../x01/x01Presets'
import {
  canonicalizeOnlineMatchConfig,
  isAllowedOnlineMatchSetup,
  isOnlineClaimTheBoardSetup,
  isV1OnlineX01Setup,
  readOnlineGameConfig,
  supportsOnlineAsyncPlay,
} from './onlineMatchSetup'

describe('onlineMatchSetup', () => {
  it('accepts the v1 online X01 setup only', () => {
    expect(isV1OnlineX01Setup(GameModeId.X01, defaultX01Config())).toBe(true)
    expect(
      isV1OnlineX01Setup(GameModeId.X01, {
        startScore: 301,
        doubleIn: false,
        doubleOut: true,
      }),
    ).toBe(false)
    expect(isAllowedOnlineMatchSetup(GameModeId.X01, defaultX01Config())).toBe(true)
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

  it('canonicalizes create-match configs', () => {
    expect(canonicalizeOnlineMatchConfig(GameModeId.X01, defaultX01Config())).toEqual(
      defaultX01Config(),
    )
    expect(
      canonicalizeOnlineMatchConfig(GameModeId.ClaimTheBoard, {
        aimMode: AroundTheClockAimMode.Trebles,
        extra: true,
      }),
    ).toEqual({ aimMode: AroundTheClockAimMode.Trebles })
    expect(canonicalizeOnlineMatchConfig(GameModeId.ClaimTheBoard, { aimMode: 'nope' })).toBeNull()
  })

  it('limits async play to X01', () => {
    expect(supportsOnlineAsyncPlay(GameModeId.X01)).toBe(true)
    expect(supportsOnlineAsyncPlay(GameModeId.ClaimTheBoard)).toBe(false)
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
  })
})
