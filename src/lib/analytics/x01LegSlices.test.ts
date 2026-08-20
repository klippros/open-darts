import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import { countDartsInVisits, expandX01SessionLegs, legFinishedWithCheckout } from './x01LegSlices'

const sampleVisit = (
  overrides: Partial<GameSession['visits'][number]> = {},
): GameSession['visits'][number] => ({
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

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [sampleVisit()],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

describe('x01LegSlices', () => {
  it('expands a multi-leg session into primary-player leg slices', () => {
    const slices = expandX01SessionLegs(
      sampleSession({
        players: [
          { id: 'player-1', name: 'You', kind: PlayerKind.Human },
          { id: 'player-2', name: 'Opponent', kind: PlayerKind.Human },
        ],
        visits: [
          sampleVisit({ legIndex: 1 }),
          sampleVisit({
            visitIndex: 1,
            playerId: 'player-2',
            checkout: true,
            scoreAfter: 0,
            legIndex: 1,
          }),
          sampleVisit({ visitIndex: 2, legIndex: 2, visitScore: 40 }),
        ],
      }),
    )

    expect(slices.map((slice) => slice.legNumber)).toEqual([1, 2])
    expect(slices[0]?.visits).toHaveLength(1)
    expect(slices[1]?.visits).toHaveLength(1)
    expect(legFinishedWithCheckout(slices[0]?.visits ?? [])).toBe(false)
    expect(countDartsInVisits(slices[1]?.visits ?? [])).toBe(1)
  })

  it('treats missing legIndex as leg 1', () => {
    const slices = expandX01SessionLegs(sampleSession())

    expect(slices).toHaveLength(1)
    expect(slices[0]?.legNumber).toBe(1)
  })
})
