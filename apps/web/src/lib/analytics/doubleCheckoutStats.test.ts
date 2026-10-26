import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '@open-darts/game/types/dart'
import type { Visit } from '@open-darts/game/types/visit'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { numberDart } from '@open-darts/game/testHelpers'
import {
  countDoubleCheckoutStats,
  countDoubleCheckoutStatsForVisit,
  countDoubleCheckoutStatsOmittingUnresolvedLegs,
  visitScoreCouldHideDoubleAttempt,
} from './doubleCheckoutStats'

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

  it('counts only the dart thrown at a double in a visit from 120', () => {
    const { stats } = countDoubleCheckoutStatsForVisit(
      visit({
        scoreBefore: 120,
        darts: [
          numberDart(20, DartMultiplier.Triple),
          numberDart(20, DartMultiplier.Single),
          numberDart(20, DartMultiplier.Single),
        ],
        visitScore: 100,
        scoreAfter: 20,
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

describe('visitScoreCouldHideDoubleAttempt', () => {
  it('returns false for a visit total above 170', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 501,
          visitScore: 180,
          scoreAfter: 321,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(false)
  })

  it('returns true for a visit total of 100 from 120', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 120,
          visitScore: 100,
          scoreAfter: 20,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(true)
  })

  it('returns false for a visit total of 26 from 120', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 120,
          visitScore: 26,
          scoreAfter: 94,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(false)
  })

  it('returns true for a visit-score checkout', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 40,
          visitScore: 40,
          scoreAfter: 0,
          checkout: true,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(true)
  })

  it('returns true when the visit starts on a finishing double', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 32,
          visitScore: 0,
          scoreAfter: 32,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(true)
  })

  it('returns false for a bogey start that cannot reach a double', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 159,
          visitScore: 60,
          scoreAfter: 99,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(false)
  })

  it('returns true for a bust from a checkout score', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 60,
          visitScore: 0,
          scoreAfter: 60,
          bust: true,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(true)
  })

  it('returns false when the visit ends above the next double under 50', () => {
    expect(
      visitScoreCouldHideDoubleAttempt(
        visit({
          scoreBefore: 45,
          visitScore: 2,
          scoreAfter: 43,
          inputMode: VisitInputMode.VisitScore,
        }),
        doubleOutRules,
        false,
        true,
      ),
    ).toBe(false)
  })
})

describe('countDoubleCheckoutStatsOmittingUnresolvedLegs', () => {
  it('counts a per-dart checkout after a visit total above 170', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 501,
          visitScore: 180,
          scoreAfter: 321,
          inputMode: VisitInputMode.VisitScore,
        }),
        visit({
          legIndex: 1,
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

    expect(result).toEqual({
      stats: { attempts: 1, successes: 1 },
      unavailable: false,
    })
  })

  it('skips a leg when a visit total of 100 from 120 could hide a double', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 120,
          visitScore: 100,
          scoreAfter: 20,
          inputMode: VisitInputMode.VisitScore,
        }),
        visit({
          legIndex: 1,
          visitIndex: 1,
          scoreBefore: 20,
          darts: [numberDart(10, DartMultiplier.Double)],
          visitScore: 20,
          scoreAfter: 0,
          checkout: true,
        }),
      ],
      doubleOutRules,
    )

    expect(result).toEqual({
      stats: { attempts: 0, successes: 0 },
      unavailable: true,
    })
  })

  it('keeps a leg when a visit total of 26 from 120 cannot hide a double', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 120,
          visitScore: 26,
          scoreAfter: 94,
          inputMode: VisitInputMode.VisitScore,
        }),
        visit({
          legIndex: 1,
          visitIndex: 1,
          scoreBefore: 40,
          darts: [numberDart(20, DartMultiplier.Double)],
          visitScore: 40,
          scoreAfter: 0,
          checkout: true,
        }),
      ],
      doubleOutRules,
    )

    expect(result).toEqual({
      stats: { attempts: 1, successes: 1 },
      unavailable: false,
    })
  })

  it('skips a visit-score checkout leg and still counts a separate per-dart leg', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 40,
          darts: [],
          visitScore: 40,
          scoreAfter: 0,
          checkout: true,
          inputMode: VisitInputMode.VisitScore,
        }),
        visit({
          legIndex: 2,
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

    expect(result).toEqual({
      stats: { attempts: 1, successes: 1 },
      unavailable: false,
    })
  })

  it('averages only legs whose finish darts were logged', () => {
    const loggedFinish = (legIndex: number, visitIndex: number): Visit =>
      visit({
        legIndex,
        visitIndex,
        scoreBefore: 32,
        darts: [numberDart(16, DartMultiplier.Double)],
        visitScore: 32,
        scoreAfter: 0,
        checkout: true,
      })

    const visitScoreFinish = (legIndex: number, visitIndex: number): Visit =>
      visit({
        legIndex,
        visitIndex,
        scoreBefore: 40,
        darts: [],
        visitScore: 40,
        scoreAfter: 0,
        checkout: true,
        inputMode: VisitInputMode.VisitScore,
      })

    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        loggedFinish(1, 0),
        visitScoreFinish(2, 1),
        loggedFinish(3, 2),
        visitScoreFinish(4, 3),
        loggedFinish(5, 4),
      ],
      doubleOutRules,
    )

    expect(result).toEqual({
      stats: { attempts: 3, successes: 3 },
      unavailable: false,
    })
  })

  it('marks unavailable when every finish was a visit total', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 40,
          visitScore: 40,
          scoreAfter: 0,
          checkout: true,
          inputMode: VisitInputMode.VisitScore,
        }),
      ],
      doubleOutRules,
    )

    expect(result).toEqual({
      stats: { attempts: 0, successes: 0 },
      unavailable: true,
    })
  })

  it('does not mark unavailable when nobody reached a double', () => {
    const result = countDoubleCheckoutStatsOmittingUnresolvedLegs(
      [
        visit({
          legIndex: 1,
          scoreBefore: 501,
          visitScore: 180,
          scoreAfter: 321,
          inputMode: VisitInputMode.VisitScore,
        }),
      ],
      doubleOutRules,
    )

    expect(result).toEqual({
      stats: { attempts: 0, successes: 0 },
      unavailable: false,
    })
  })
})
