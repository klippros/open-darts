import { describe, expect, it } from 'vitest'
import {
  buildBullRunGamePath,
  clampBullRunTargetScore,
  DEFAULT_BULL_RUN_CONFIG,
  getBullRunConfig,
  parseBullRunConfigFromSearchParams,
  parseBullRunTargetScore,
} from './bullRunConfig'

describe('bullRunConfig', () => {
  it('defaults to 15', () => {
    expect(DEFAULT_BULL_RUN_CONFIG).toEqual({ targetScore: 15 })
    expect(parseBullRunTargetScore(null)).toBe(15)
    expect(parseBullRunTargetScore('nope')).toBe(15)
  })

  it('clamps target scores to 5–50', () => {
    expect(clampBullRunTargetScore(4)).toBe(5)
    expect(clampBullRunTargetScore(51)).toBe(50)
    expect(clampBullRunTargetScore(20.6)).toBe(21)
    expect(getBullRunConfig({ targetScore: 3 })).toEqual({ targetScore: 5 })
  })

  it('keeps a positive starting score for async rebuilds', () => {
    expect(getBullRunConfig({ targetScore: 15, startingScore: 8 })).toEqual({
      targetScore: 15,
      startingScore: 8,
    })
    expect(getBullRunConfig({ targetScore: 15, startingScore: 0 })).toEqual({ targetScore: 15 })
  })

  it('parses URL params and builds game paths', () => {
    expect(parseBullRunConfigFromSearchParams(new URLSearchParams('target=20'))).toEqual({
      targetScore: 20,
    })
    expect(buildBullRunGamePath({ targetScore: 15 })).toBe('/game?mode=bull-run&target=15')

    const opponent = new URLSearchParams({
      opponent: 'guest',
      guestName: 'Guest',
      starter: '0',
      legs: '1',
    })
    expect(buildBullRunGamePath({ targetScore: 25 }, opponent)).toBe(
      '/game?opponent=guest&guestName=Guest&starter=0&legs=1&mode=bull-run&target=25',
    )
  })
})
