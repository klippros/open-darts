import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import type { Visit } from '../../types/visit'
import { numberDart } from '../testHelpers'
import {
  computeBob27SingleSessionStats,
  getBob27SessionDoublesHit,
  getBob27VisitHitCount,
  getBob27VisitHitRate,
} from './bob27VisitStats'

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

const session = (visits: Visit[]): GameSession => ({
  id: 'session-1',
  mode: GameModeId.Bob27,
  config: { startScore: 27 },
  players: [{ id: 'p1', name: 'You', kind: PlayerKind.Human }],
  visits,
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:30:00.000Z',
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

  it('computes hit rate per dart across visits', () => {
    expect(
      getBob27VisitHitRate([
        visit({
          metadata: { hit: true, hitCount: 1 },
          darts: [
            numberDart(1, DartMultiplier.Double),
            numberDart(1, DartMultiplier.Single),
            numberDart(1, DartMultiplier.Single),
          ],
        }),
        visit({
          metadata: { hit: false, hitCount: 0 },
          darts: [
            numberDart(2, DartMultiplier.Single),
            numberDart(2, DartMultiplier.Single),
            numberDart(2, DartMultiplier.Single),
          ],
        }),
        visit({
          metadata: { hit: true, hitCount: 3 },
          darts: [
            numberDart(3, DartMultiplier.Double),
            numberDart(3, DartMultiplier.Double),
            numberDart(3, DartMultiplier.Double),
          ],
        }),
      ]),
    ).toBeCloseTo((4 / 9) * 100)
  })

  it('sums doubles hit across a session', () => {
    expect(
      getBob27SessionDoublesHit(
        session([
          visit({ metadata: { targetLabel: 'D1', hit: true, hitCount: 2 } }),
          visit({
            visitIndex: 1,
            metadata: { targetLabel: 'D2', hit: false, hitCount: 0 },
          }),
          visit({
            visitIndex: 2,
            metadata: { targetLabel: 'Bull', hit: true, hitCount: 1 },
          }),
        ]),
      ),
    ).toBe(3)
  })

  it('computes single-session summary stats', () => {
    const stats = computeBob27SingleSessionStats(
      session([
        visit({
          metadata: { targetLabel: 'D1', hit: true, hitCount: 2 },
          darts: [
            numberDart(1, DartMultiplier.Double),
            numberDart(1, DartMultiplier.Double),
            numberDart(1, DartMultiplier.Single),
          ],
          scoreAfter: 31,
        }),
        visit({
          visitIndex: 1,
          metadata: { targetLabel: 'D2', hit: false, hitCount: 0 },
          darts: [
            numberDart(2, DartMultiplier.Single),
            numberDart(2, DartMultiplier.Single),
            numberDart(2, DartMultiplier.Single),
          ],
          scoreAfter: 21,
        }),
        visit({
          visitIndex: 2,
          metadata: { targetLabel: 'Bull', hit: true, hitCount: 1 },
          darts: [
            numberDart(25, DartMultiplier.Single),
            numberDart(25, DartMultiplier.Single),
            numberDart(20, DartMultiplier.Single),
          ],
          scoreAfter: 71,
        }),
      ]),
    )

    expect(stats).not.toBeNull()
    expect(stats?.doublesHit).toBe(3)
    expect(stats?.avgHitsPerVisit).toBe(1)
    expect(stats?.hitRate).toBeCloseTo((3 / 9) * 100)
    expect(stats?.finalScore).toBe(71)
    expect(stats?.visitCount).toBe(3)
  })

  it('returns null for non-Bob27 sessions', () => {
    expect(
      computeBob27SingleSessionStats({
        ...session([]),
        mode: GameModeId.X01,
        config: { startScore: 501, doubleIn: false, doubleOut: true },
      }),
    ).toBeNull()
  })
})
