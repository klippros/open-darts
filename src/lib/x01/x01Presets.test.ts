import { describe, expect, it } from 'vitest'
import {
  buildX01CustomGamePath,
  buildX01GameSearchParams,
  getX01PresetConfig,
  parseStartScore,
  parseX01ConfigFromSearchParams,
  X01PresetId,
  x01PresetConfigs,
} from './x01Presets'

describe('x01Presets', () => {
  it('exposes standard x01 preset configs', () => {
    expect(x01PresetConfigs[X01PresetId.ThreeOhOne].startScore).toBe(301)
    expect(x01PresetConfigs[X01PresetId.FourOhOne].startScore).toBe(401)
    expect(x01PresetConfigs[X01PresetId.FiveOhOne].startScore).toBe(501)
  })

  it('parses preset ids from search params', () => {
    const config = parseX01ConfigFromSearchParams(new URLSearchParams('preset=301'))

    expect(config).toEqual(getX01PresetConfig('301'))
  })

  it('parses custom start score and rule flags from search params', () => {
    const config = parseX01ConfigFromSearchParams(
      new URLSearchParams('start=150&doubleIn=1&doubleOut=0'),
    )

    expect(config).toEqual({
      startScore: 150,
      doubleIn: true,
      doubleOut: false,
    })
  })

  it('falls back to 501 when start score is invalid', () => {
    expect(parseStartScore('abc')).toBe(501)
    expect(parseStartScore('1')).toBe(501)
    expect(parseStartScore('1000')).toBe(501)
  })

  it('builds custom game paths from config', () => {
    expect(
      buildX01CustomGamePath({
        startScore: 401,
        doubleIn: true,
        doubleOut: false,
      }),
    ).toBe('/game?start=401&doubleIn=1&doubleOut=0')

    expect(buildX01GameSearchParams(x01PresetConfigs[X01PresetId.FiveOhOne]).toString()).toBe(
      'start=501',
    )
  })
})
