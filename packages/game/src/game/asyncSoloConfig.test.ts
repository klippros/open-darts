import { describe, expect, it } from 'vitest'
import { DEFAULT_BULL_RUN_CONFIG } from '../bullRun/bullRunConfig'
import { GameModeId } from '../types/gameMode'
import type { BullRunState } from '../types/bullRun'
import type { X01State } from '../types/x01'
import { defaultX01Config } from '../x01/x01Presets'
import { buildAsyncSoloConfig, readAsyncStartScore } from './asyncSoloConfig'

describe('asyncSoloConfig', () => {
  it('rebuilds X01 solo config with the stream start score', () => {
    expect(buildAsyncSoloConfig(GameModeId.X01, defaultX01Config(), 320)).toEqual({
      ...defaultX01Config(),
      startScore: 320,
    })
  })

  it('rebuilds Bull Run solo config with optional starting score', () => {
    expect(buildAsyncSoloConfig(GameModeId.BullRun, DEFAULT_BULL_RUN_CONFIG, 0)).toEqual({
      targetScore: 15,
    })
    expect(buildAsyncSoloConfig(GameModeId.BullRun, DEFAULT_BULL_RUN_CONFIG, 8)).toEqual({
      targetScore: 15,
      startingScore: 8,
    })
  })

  it('rejects modes that do not support async solo rebuild', () => {
    expect(buildAsyncSoloConfig(GameModeId.Hunter, { startingPlayerIndex: 0 }, 0)).toBeNull()
  })

  it('reads X01 remaining and Bull Run score as start scores', () => {
    const x01State: X01State = {
      config: defaultX01Config(),
      players: {
        p1: { remaining: 401, hasOpened: true },
      },
    }
    const bullRunState: BullRunState = {
      config: DEFAULT_BULL_RUN_CONFIG,
      players: {
        p1: { score: 6, dartsThrown: 3 },
      },
    }

    expect(readAsyncStartScore(GameModeId.X01, defaultX01Config(), x01State, 'p1')).toBe(401)
    expect(readAsyncStartScore(GameModeId.X01, defaultX01Config(), x01State, 'missing')).toBe(501)
    expect(
      readAsyncStartScore(GameModeId.BullRun, DEFAULT_BULL_RUN_CONFIG, bullRunState, 'p1'),
    ).toBe(6)
    expect(
      readAsyncStartScore(GameModeId.BullRun, DEFAULT_BULL_RUN_CONFIG, bullRunState, 'missing'),
    ).toBe(0)
    expect(readAsyncStartScore(GameModeId.Hunter, { startingPlayerIndex: 0 }, {}, 'p1')).toBeNull()
  })
})
