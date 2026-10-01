import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import { PlayerKind } from '@open-darts/game/types/player'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { Visit } from '@open-darts/game/types/visit'
import { buildHunterThrow } from '@open-darts/game/hunter/buildHunterDarts'
import { computeHunterPlayerStats, computeHunterSingleSessionStats } from './hunterVisitStats'

const visit = (overrides: Partial<Visit> & Pick<Visit, 'visitIndex' | 'playerId'>): Visit => ({
  darts: [],
  visitScore: 0,
  scoreBefore: 0,
  scoreAfter: 0,
  bust: false,
  checkout: false,
  ...overrides,
})

const session = (visits: Visit[]): GameSession => ({
  id: 'hunter-1',
  mode: GameModeId.Hunter,
  config: { startingPlayerIndex: 0 },
  players: [
    { id: 'p1', name: 'You', kind: PlayerKind.Human },
    { id: 'p2', name: 'Guest', kind: PlayerKind.Human },
  ],
  visits,
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:10:00.000Z',
})

describe('hunterVisitStats', () => {
  it('aggregates hit rate and advances from visit metadata and darts', () => {
    const stats = computeHunterPlayerStats(
      [
        visit({
          visitIndex: 0,
          playerId: 'p1',
          visitScore: 3,
          scoreBefore: 1,
          scoreAfter: 13,
          darts: [
            buildHunterThrow(HunterOutcome.Single, 1),
            buildHunterThrow(HunterOutcome.Miss, 18),
            buildHunterThrow(HunterOutcome.Double, 18),
          ],
          metadata: { fieldNumber: 1, advances: 3 },
        }),
      ],
      'p1',
    )

    expect(stats).toMatchObject({
      dartsThrown: 3,
      hits: 2,
      advances: 3,
      visitCount: 1,
      hitRate: (2 / 3) * 100,
      avgAdvancesPerVisit: 3,
    })
  })

  it('folds pending darts into live stats', () => {
    const stats = computeHunterPlayerStats(
      [
        visit({
          visitIndex: 0,
          playerId: 'p1',
          visitScore: 1,
          darts: [buildHunterThrow(HunterOutcome.Single, 1)],
          metadata: { fieldNumber: 1, advances: 1 },
        }),
      ],
      'p1',
      [buildHunterThrow(HunterOutcome.Triple, 18), buildHunterThrow(HunterOutcome.Miss, 4)],
    )

    expect(stats).toMatchObject({
      dartsThrown: 3,
      hits: 2,
      advances: 4,
      visitCount: 2,
      avgAdvancesPerVisit: 2,
    })
  })

  it('builds single-session stats for hunter sessions only', () => {
    expect(computeHunterSingleSessionStats(session([]))?.players).toHaveLength(2)
    expect(
      computeHunterSingleSessionStats({
        ...session([]),
        mode: GameModeId.X01,
      }),
    ).toBeNull()
  })
})
