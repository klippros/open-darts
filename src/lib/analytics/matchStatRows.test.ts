import { describe, expect, it } from 'vitest'
import { MatchStatRowId, getVisibleMatchStatRows } from './matchStatRows'
import type { PlayerMatchStats } from './matchPlayerStats'

const stats = (overrides: Partial<PlayerMatchStats> = {}): PlayerMatchStats => ({
  threeDartAverage: 85,
  threeDartAverageUntil170: 90,
  thrown180: 0,
  thrown140Plus: 0,
  thrown100Plus: 0,
  doubleCheckout: { attempts: 0, successes: 0 },
  checkouts100Plus: 0,
  highestCheckout: null,
  highestVisit: null,
  ...overrides,
})

describe('getVisibleMatchStatRows', () => {
  it('shows scoring threshold rows only when a player hit them', () => {
    const rows = getVisibleMatchStatRows(
      {
        alice: stats({ thrown180: 1, highestVisit: 180 }),
        bob: stats({ thrown100Plus: 2, highestVisit: 100 }),
      },
      ['alice', 'bob'],
    )

    expect(rows.map((row) => row.id)).toEqual([
      MatchStatRowId.ThreeDartAverage,
      MatchStatRowId.ThreeDartAverageUntil170,
      MatchStatRowId.Thrown180,
      MatchStatRowId.Thrown100Plus,
      MatchStatRowId.HighestVisit,
      MatchStatRowId.Checkouts,
      MatchStatRowId.HighestCheckout,
    ])
  })

  it('hides highest visit when every player scored a 180', () => {
    const rows = getVisibleMatchStatRows(
      {
        alice: stats({ thrown180: 1, highestVisit: 180 }),
        bob: stats({ thrown180: 2, highestVisit: 180 }),
      },
      ['alice', 'bob'],
    )

    expect(rows.some((row) => row.id === MatchStatRowId.HighestVisit)).toBe(false)
    expect(rows.some((row) => row.id === MatchStatRowId.Thrown180)).toBe(true)
  })

  it('shows checkouts 100+ only when at least one player hit it', () => {
    const rows = getVisibleMatchStatRows(
      {
        alice: stats({ checkouts100Plus: 1 }),
        bob: stats(),
      },
      ['alice', 'bob'],
    )

    expect(rows.some((row) => row.id === MatchStatRowId.Checkouts100Plus)).toBe(true)
  })
})
