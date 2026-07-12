import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import type { Visit } from '../../types/visit'
import { numberDart } from '../testHelpers'
import { countDoubleCheckoutStats, countDoubleCheckoutStatsForVisit } from './doubleCheckoutStats'

const doubleOutRules = {
  doubleIn: false,
  doubleOut: true,
}

const visit = (overrides: Partial<Visit>): Visit => ({
  visitIndex: 0,
  playerId: 'p1',
  darts: [],
  visitScore: 0,
  scoreBefore: 501,
  scoreAfter: 501,
  bust: false,
  checkout: false,
  ...overrides,
})

describe('countDoubleCheckoutStatsForVisit', () => {
  it('counts a missed double when S16 is thrown instead of D16', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 32,
        darts: [numberDart(16, DartMultiplier.Single)],
        visitScore: 16,
        scoreAfter: 16,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 1, successes: 0 })
  })

  it('does not count setup when S6 is thrown with D19 available', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 38,
        darts: [numberDart(6, DartMultiplier.Single)],
        visitScore: 6,
        scoreAfter: 32,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 0, successes: 0 })
  })

  it('counts a successful D16 checkout', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 32,
        darts: [numberDart(16, DartMultiplier.Double)],
        visitScore: 32,
        scoreAfter: 0,
        checkout: true,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 1, successes: 1 })
  })

  it('counts a bust on a double attempt as a miss', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 32,
        darts: [numberDart(16, DartMultiplier.Triple)],
        visitScore: 48,
        scoreAfter: 32,
        bust: true,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 1, successes: 0 })
  })

  it('only evaluates the finishing dart on a two-dart PDC path', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 60,
        darts: [numberDart(20, DartMultiplier.Single), numberDart(20, DartMultiplier.Double)],
        visitScore: 60,
        scoreAfter: 0,
        checkout: true,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 1, successes: 1 })
  })

  it('counts a complete miss on a finishing double as an attempt', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 32,
        darts: [{ ...numberDart(20, DartMultiplier.Miss), points: 0 }],
        visitScore: 0,
        scoreAfter: 32,
      }),
      doubleOutRules,
      false,
      true,
    )

    expect(stats).toEqual({ attempts: 1, successes: 0 })
  })
})

describe('countDoubleCheckoutStats', () => {
  it('merges stats across visits', () => {
    const stats = countDoubleCheckoutStats(
      [
        visit({
          scoreBefore: 32,
          darts: [numberDart(16, DartMultiplier.Single)],
          visitScore: 16,
          scoreAfter: 16,
        }),
        visit({
          visitIndex: 1,
          scoreBefore: 16,
          darts: [numberDart(8, DartMultiplier.Double)],
          visitScore: 16,
          scoreAfter: 0,
          checkout: true,
        }),
      ],
      doubleOutRules,
    )

    expect(stats).toEqual({ attempts: 2, successes: 1 })
  })
})
