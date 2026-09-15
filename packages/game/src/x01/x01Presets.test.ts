import { describe, expect, it } from 'vitest'
import {
  buildX01CustomGamePath,
  buildX01GameSearchParams,
  getX01PresetConfig,
  findX01PresetId,
  formatX01StartScore,
  parseOptionalStartScore,
  parseStartScore,
  parseX01ConfigFromSearchParams,
  x01ConfigsMatch,
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
    ).toBe('/game/match-setup?start=401&doubleIn=1&doubleOut=0')

    expect(buildX01GameSearchParams(x01PresetConfigs[X01PresetId.FiveOhOne]).toString()).toBe(
      'start=501',
    )
  })

  it('matches x01 configs and finds preset ids', () => {
    const preset501 = x01PresetConfigs[X01PresetId.FiveOhOne]

    expect(x01ConfigsMatch(preset501, { ...preset501 })).toBe(true)
    expect(x01ConfigsMatch(preset501, { ...preset501, startScore: 301 })).toBe(false)
    expect(findX01PresetId(preset501)).toBe(X01PresetId.FiveOhOne)
    expect(findX01PresetId({ startScore: 333, doubleIn: false, doubleOut: true })).toBeNull()
  })

  it('parses optional start score input for forms', () => {
    expect(parseOptionalStartScore('401')).toBe(401)
    expect(parseOptionalStartScore('')).toBeNull()
    expect(parseOptionalStartScore('abc')).toBeNull()
    expect(formatX01StartScore({ startScore: 301, doubleIn: false, doubleOut: true })).toBe('301')
  })
})
