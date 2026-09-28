import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import { PlayerKind } from '@open-darts/game/types/player'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { Visit } from '@open-darts/game/types/visit'
import {
  computeClaimTheBoardPlayerVisitStats,
  computeClaimTheBoardSingleSessionStats,
  getClaimTheBoardScoreLeaderId,
  getClaimTheBoardVisitHitCount,
} from './claimTheBoardVisitStats'

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
  id: 'claim-1',
  mode: GameModeId.ClaimTheBoard,
  config: { aimMode: AroundTheClockAimMode.Any },
  players: [
    { id: 'p1', name: 'You', kind: PlayerKind.Human },
    { id: 'p2', name: 'Guest', kind: PlayerKind.Human },
  ],
  visits,
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:10:00.000Z',
})

describe('claimTheBoardVisitStats', () => {
  it('reads hit counts from visit metadata', () => {
    expect(
      getClaimTheBoardVisitHitCount(
        visit({
          visitIndex: 0,
          playerId: 'p1',
          metadata: { hitCount: 2, hit: true, targetLabel: '20' },
        }),
      ),
    ).toBe(2)
  })

  it('aggregates claimed fields and hit-count buckets', () => {
    const stats = computeClaimTheBoardPlayerVisitStats([
      visit({
        visitIndex: 0,
        playerId: 'p1',
        visitScore: 0,
        scoreAfter: 0,
        metadata: { hitCount: 0, hit: false },
      }),
      visit({
        visitIndex: 1,
        playerId: 'p1',
        visitScore: 20,
        scoreAfter: 20,
        metadata: { hitCount: 1, hit: true },
      }),
      visit({
        visitIndex: 2,
        playerId: 'p1',
        visitScore: 40,
        scoreAfter: 60,
        metadata: { hitCount: 2, hit: true },
      }),
      visit({
        visitIndex: 3,
        playerId: 'p1',
        visitScore: 60,
        scoreAfter: 120,
        metadata: { hitCount: 3, hit: true },
      }),
    ])

    expect(stats).toEqual({
      visitCount: 4,
      totalHits: 6,
      avgHitsPerVisit: 1.5,
      fieldsClaimed: 3,
      fieldsHitOnce: 1,
      fieldsHitTwice: 1,
      fieldsHitThrice: 1,
      finalScore: 120,
    })
  })

  it('builds per-player session stats', () => {
    const stats = computeClaimTheBoardSingleSessionStats(
      session([
        visit({
          visitIndex: 0,
          playerId: 'p1',
          visitScore: 40,
          scoreAfter: 40,
          metadata: { hitCount: 2, hit: true },
        }),
        visit({
          visitIndex: 1,
          playerId: 'p2',
          visitScore: 0,
          scoreAfter: 0,
          metadata: { hitCount: 0, hit: false },
        }),
        visit({
          visitIndex: 2,
          playerId: 'p1',
          visitScore: 20,
          scoreAfter: 60,
          metadata: { hitCount: 1, hit: true },
        }),
      ]),
    )

    expect(stats?.players).toEqual([
      {
        playerId: 'p1',
        playerName: 'You',
        visitCount: 2,
        totalHits: 3,
        avgHitsPerVisit: 1.5,
        fieldsClaimed: 2,
        fieldsHitOnce: 1,
        fieldsHitTwice: 1,
        fieldsHitThrice: 0,
        finalScore: 60,
      },
      {
        playerId: 'p2',
        playerName: 'Guest',
        visitCount: 1,
        totalHits: 0,
        avgHitsPerVisit: 0,
        fieldsClaimed: 0,
        fieldsHitOnce: 0,
        fieldsHitTwice: 0,
        fieldsHitThrice: 0,
        finalScore: 0,
      },
    ])
  })

  it('picks the score leader and clears ties', () => {
    expect(
      getClaimTheBoardScoreLeaderId(
        {
          p1: {
            visitCount: 1,
            totalHits: 3,
            avgHitsPerVisit: 3,
            fieldsClaimed: 1,
            fieldsHitOnce: 0,
            fieldsHitTwice: 0,
            fieldsHitThrice: 1,
            finalScore: 60,
          },
          p2: {
            visitCount: 1,
            totalHits: 1,
            avgHitsPerVisit: 1,
            fieldsClaimed: 1,
            fieldsHitOnce: 1,
            fieldsHitTwice: 0,
            fieldsHitThrice: 0,
            finalScore: 20,
          },
        },
        ['p1', 'p2'],
      ),
    ).toBe('p1')

    expect(
      getClaimTheBoardScoreLeaderId(
        {
          p1: {
            visitCount: 1,
            totalHits: 1,
            avgHitsPerVisit: 1,
            fieldsClaimed: 1,
            fieldsHitOnce: 1,
            fieldsHitTwice: 0,
            fieldsHitThrice: 0,
            finalScore: 40,
          },
          p2: {
            visitCount: 1,
            totalHits: 2,
            avgHitsPerVisit: 2,
            fieldsClaimed: 1,
            fieldsHitOnce: 0,
            fieldsHitTwice: 1,
            fieldsHitThrice: 0,
            finalScore: 40,
          },
        },
        ['p1', 'p2'],
      ),
    ).toBeUndefined()
  })
})
