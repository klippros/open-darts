import { describe, expect, it } from 'vitest'
import { NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import {
  buildNinetyNineDartsGamePath,
  DEFAULT_NINETY_NINE_DARTS_CONFIG,
  parseNinetyNineDartsConfigFromSearchParams,
  parseNinetyNineDartsTarget,
} from './ninetyNineDartsConfig'

describe('ninetyNineDartsConfig', () => {
  it('defaults to 20', () => {
    expect(DEFAULT_NINETY_NINE_DARTS_CONFIG).toEqual({
      target: { kind: NinetyNineDartsTargetKind.Number, value: 20 },
    })
    expect(parseNinetyNineDartsTarget(null)).toEqual({
      kind: NinetyNineDartsTargetKind.Number,
      value: 20,
    })
  })

  it('parses number and bull targets from search params', () => {
    expect(parseNinetyNineDartsConfigFromSearchParams(new URLSearchParams('target=5'))).toEqual({
      target: { kind: NinetyNineDartsTargetKind.Number, value: 5 },
    })
    expect(parseNinetyNineDartsConfigFromSearchParams(new URLSearchParams('target=bull'))).toEqual({
      target: { kind: NinetyNineDartsTargetKind.Bull },
    })
    expect(parseNinetyNineDartsConfigFromSearchParams(new URLSearchParams('target=99'))).toEqual(
      DEFAULT_NINETY_NINE_DARTS_CONFIG,
    )
  })

  it('builds a game path with the target param', () => {
    expect(
      buildNinetyNineDartsGamePath({
        target: { kind: NinetyNineDartsTargetKind.Number, value: 20 },
      }),
    ).toBe('/game?mode=99-darts&target=20')
    expect(
      buildNinetyNineDartsGamePath({
        target: { kind: NinetyNineDartsTargetKind.Bull },
      }),
    ).toBe('/game?mode=99-darts&target=bull')
  })
})
