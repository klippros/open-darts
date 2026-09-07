import { describe, expect, it } from 'vitest'
import { PlayerKind } from '../../types/player'
import type { Visit } from '../../types/visit'
import { getVisitAverages, getLegAndMatchAverages } from './visitStats'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }

const visit = (overrides: Partial<Visit>): Visit => ({
  visitIndex: 0,
  playerId: player.id,
  darts: [],
  visitScore: 0,
  scoreBefore: 501,
  scoreAfter: 501,
  bust: false,
  checkout: false,
  ...overrides,
})

describe('getVisitAverages', () => {
  it('returns null when a player has no visits', () => {
    expect(getVisitAverages([player], [])).toEqual({ [player.id]: null })
  })

  it('counts bust visits as zero toward the visit average', () => {
    const visits = [
      visit({ visitIndex: 0, visitScore: 60, scoreAfter: 441 }),
      visit({ visitIndex: 1, visitScore: 0, bust: true, scoreAfter: 441 }),
    ]

    expect(getVisitAverages([player], visits)[player.id]).toBe(30)
  })
})

describe('getLegAndMatchAverages', () => {
  it('computes leg and match averages separately', () => {
    const averages = getLegAndMatchAverages(
      [player],
      [
        visit({ visitIndex: 0, visitScore: 100, scoreAfter: 401, legIndex: 1 }),
        visit({ visitIndex: 1, visitScore: 60, scoreAfter: 341, legIndex: 2 }),
      ],
      2,
    )

    expect(averages[player.id]).toEqual({ leg: 60, match: 80 })
  })
})
