import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { describe, expect, it } from 'vitest'
import { parsePublicDartThrow, parsePublicDartThrows } from '../src/match/dartPayload'

describe('parsePublicDartThrow', () => {
  it('recomputes points from segment and multiplier', () => {
    const dart = parsePublicDartThrow({
      segment: { type: 'number', value: 20 },
      multiplier: DartMultiplier.Triple,
      points: 60,
      timestamp: '2026-01-01T00:00:00.000Z',
    })

    expect(dart).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 20 },
      multiplier: DartMultiplier.Triple,
      points: 60,
    })
  })

  it('rejects mismatched client points', () => {
    expect(
      parsePublicDartThrow({
        segment: { type: 'number', value: 20 },
        multiplier: DartMultiplier.Triple,
        points: 180,
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('accepts darts without a points field and recomputes', () => {
    const dart = parsePublicDartThrow({
      segment: { type: 'number', value: 20 },
      multiplier: DartMultiplier.Double,
      timestamp: '2026-01-01T00:00:00.000Z',
    })

    expect(dart?.points).toBe(40)
  })

  it('rejects invalid number segments', () => {
    expect(
      parsePublicDartThrow({
        segment: { type: 'number', value: 21 },
        multiplier: DartMultiplier.Single,
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toBeNull()
  })
})

describe('parsePublicDartThrows', () => {
  it('rejects a visit when any dart has forged points', () => {
    expect(
      parsePublicDartThrows([
        {
          segment: { type: 'number', value: 20 },
          multiplier: DartMultiplier.Triple,
          points: 60,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
        {
          segment: { type: 'number', value: 20 },
          multiplier: DartMultiplier.Triple,
          points: 999,
          timestamp: '2026-01-01T00:00:01.000Z',
        },
      ]),
    ).toBeNull()
  })
})
