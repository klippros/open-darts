import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { getLegAndMatchAverages, getPrimaryPlayerVisits, getVisitAverages } from './visitStats'

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

describe('getPrimaryPlayerVisits', () => {
  it('prefers the human player when they are not first in the roster', () => {
    const sessionsVisits = [
      visit({ visitIndex: 0, playerId: 'remote', visitScore: 20 }),
      visit({ visitIndex: 1, playerId: 'p1', visitScore: 60 }),
    ]

    const visits = getPrimaryPlayerVisits({
      id: 'match-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [
        { id: 'remote', name: 'Opponent', kind: PlayerKind.Remote },
        { id: 'p1', name: 'You', kind: PlayerKind.Human },
      ],
      visits: sessionsVisits,
      status: GameStatus.Completed,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:10:00.000Z',
    })

    expect(visits).toHaveLength(1)
    expect(visits[0]?.playerId).toBe('p1')
  })
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

  it('ignores voided visits', () => {
    const visits = [
      visit({ visitIndex: 0, visitScore: 60, scoreAfter: 441 }),
      visit({ visitIndex: 1, visitScore: 180, scoreAfter: 261, voided: true }),
    ]

    expect(getVisitAverages([player], visits)[player.id]).toBe(60)
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
