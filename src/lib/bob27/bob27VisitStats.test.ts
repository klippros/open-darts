import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import type { Visit } from '../../types/visit'
import { numberDart } from '../testHelpers'
import { getBob27VisitHitCount, getBob27VisitHitRate } from './bob27VisitStats'

const visit = (overrides: Partial<Visit>): Visit => ({
  visitIndex: 0,
  playerId: 'p1',
  darts: [],
  visitScore: 0,
  scoreBefore: 27,
  scoreAfter: 27,
  bust: false,
  checkout: false,
  ...overrides,
})

describe('bob27VisitStats', () => {
  it('prefers metadata hitCount when present', () => {
    expect(
      getBob27VisitHitCount(
        visit({
          metadata: { targetLabel: 'D3', hit: true, hitCount: 2 },
        }),
      ),
    ).toBe(2)
  })

  it('falls back to legacy boolean hit metadata', () => {
    expect(getBob27VisitHitCount(visit({ metadata: { targetLabel: 'D1', hit: true } }))).toBe(1)
    expect(getBob27VisitHitCount(visit({ metadata: { targetLabel: 'D1', hit: false } }))).toBe(0)
  })

  it('counts hits from darts when target label is known', () => {
    expect(
      getBob27VisitHitCount(
        visit({
          metadata: { targetLabel: 'D4' },
          darts: [
            numberDart(4, DartMultiplier.Double),
            numberDart(4, DartMultiplier.Double),
            numberDart(4, DartMultiplier.Single),
          ],
        }),
      ),
    ).toBe(2)
  })

  it('computes hit rate across visits', () => {
    expect(
      getBob27VisitHitRate([
        visit({ metadata: { hit: true, hitCount: 1 } }),
        visit({ metadata: { hit: false, hitCount: 0 } }),
        visit({ metadata: { hit: true, hitCount: 3 } }),
      ]),
    ).toBeCloseTo((2 / 3) * 100)
  })
})
