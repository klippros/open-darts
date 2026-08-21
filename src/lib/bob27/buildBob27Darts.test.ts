import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import { buildBob27DartsForHitCount, createBob27HitDart } from './buildBob27Darts'

describe('buildBob27Darts', () => {
  it('builds a bull hit dart for the bull target', () => {
    expect(createBob27HitDart(20)).toMatchObject({
      segment: { type: DartSegmentType.Bull },
      multiplier: DartMultiplier.Single,
    })
  })

  it('builds hit-count visits with remaining misses', () => {
    const darts = buildBob27DartsForHitCount(2, 2)

    expect(darts).toHaveLength(3)
    expect(darts[0]).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 3 },
      multiplier: DartMultiplier.Double,
    })
    expect(darts[1]).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 3 },
      multiplier: DartMultiplier.Double,
    })
    expect(darts[2]?.multiplier).toBe(DartMultiplier.Miss)
  })

  it('builds three miss darts for zero hits', () => {
    const darts = buildBob27DartsForHitCount(0, 2)

    expect(darts).toHaveLength(3)
    expect(darts.every((dart) => dart.multiplier === DartMultiplier.Miss)).toBe(true)
  })
})
