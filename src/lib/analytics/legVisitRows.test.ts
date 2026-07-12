import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import { buildLegVisitRows, formatLegVisitScore } from './legVisitRows'
import { getLegWinnerIdFromVisits } from '../game/matchLegs'
import type { Visit } from '../../types/visit'

const visit = (overrides: Partial<Visit> = {}): Visit => ({
  visitIndex: 0,
  playerId: 'player-1',
  darts: [numberDart(20, DartMultiplier.Triple)],
  visitScore: 60,
  scoreBefore: 501,
  scoreAfter: 441,
  bust: false,
  checkout: false,
  ...overrides,
})

describe('legVisitRows', () => {
  it('returns the checkout player as the leg winner', () => {
    const visits = [
      visit({ visitIndex: 0, playerId: 'player-1', legIndex: 1 }),
      visit({
        visitIndex: 1,
        playerId: 'player-2',
        checkout: true,
        scoreBefore: 40,
        scoreAfter: 0,
        legIndex: 1,
      }),
    ]

    expect(getLegWinnerIdFromVisits(visits, 1)).toBe('player-2')
    expect(getLegWinnerIdFromVisits(visits, 2)).toBeUndefined()
  })

  it('formats bust visits as Bust', () => {
    expect(formatLegVisitScore(visit({ bust: true, visitScore: 0 }))).toBe('Bust')
    expect(formatLegVisitScore(visit({ visitScore: 180 }))).toBe('180')
  })

  it('pairs each player nth visit on the same row for two players', () => {
    const rows = buildLegVisitRows(
      [
        visit({ visitIndex: 0, playerId: 'player-1', visitScore: 180 }),
        visit({ visitIndex: 1, playerId: 'player-2', visitScore: 140 }),
        visit({ visitIndex: 2, playerId: 'player-1', visitScore: 100 }),
        visit({ visitIndex: 3, playerId: 'player-2', visitScore: 0, bust: true }),
      ],
      ['player-1', 'player-2'],
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.label).toBe('Visit 1')
    expect(rows[0]?.getCellValue('player-1')).toBe('180')
    expect(rows[0]?.getCellValue('player-2')).toBe('140')
    expect(rows[1]?.getCellValue('player-1')).toBe('100')
    expect(rows[1]?.getCellValue('player-2')).toBe('Bust')
    expect(rows[1]?.getCellColor?.('player-2')).toBe('red.300')
  })

  it('shows a dash when one player has fewer visits in the leg', () => {
    const rows = buildLegVisitRows(
      [
        visit({ visitIndex: 0, playerId: 'player-1', visitScore: 180 }),
        visit({ visitIndex: 1, playerId: 'player-2', visitScore: 140 }),
        visit({
          visitIndex: 2,
          playerId: 'player-1',
          visitScore: 121,
          checkout: true,
          scoreBefore: 121,
          scoreAfter: 0,
        }),
      ],
      ['player-1', 'player-2'],
    )

    expect(rows).toHaveLength(2)
    expect(rows[1]?.getCellValue('player-1')).toBe('121')
    expect(rows[1]?.getCellValue('player-2')).toBe('—')
  })

  it('keeps chronological rows for solo players', () => {
    const rows = buildLegVisitRows(
      [
        visit({ visitIndex: 0, playerId: 'player-1', visitScore: 180 }),
        visit({ visitIndex: 1, playerId: 'player-1', visitScore: 140 }),
      ],
      ['player-1'],
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.getCellValue('player-1')).toBe('180')
    expect(rows[1]?.getCellValue('player-1')).toBe('140')
  })
})
