import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import {
  NinetyNineDartsOutcome,
  NinetyNineDartsTargetKind,
} from '@open-darts/game/types/ninetyNineDarts'
import { PlayerKind } from '@open-darts/game/types/player'
import { buildNinetyNineDartsThrow } from '@open-darts/game/ninetyNineDarts/buildNinetyNineDarts'
import type { GameSession } from '@open-darts/game/types/gameSession'
import {
  computeNinetyNineDartsSingleSessionStats,
  getNinetyNineDartsLiveScoreMetrics,
  getNinetyNineDartsLiveStats,
  getNinetyNineDartsStatGroup,
  NinetyNineDartsStatGroup,
} from './ninetyNineVisitStats'

const playerId = 'p1'
const target = { kind: NinetyNineDartsTargetKind.Number, value: 20 } as const

const makeSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 's1',
  mode: GameModeId.NinetyNineDarts,
  config: { target },
  players: [{ id: playerId, name: 'Player', kind: PlayerKind.Human }],
  visits: [
    {
      visitIndex: 0,
      playerId,
      darts: [
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, target),
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, target),
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, target),
      ],
      visitScore: 6,
      scoreBefore: 0,
      scoreAfter: 6,
      bust: false,
      checkout: false,
    },
  ],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:10:00.000Z',
  ...overrides,
})

describe('ninetyNineVisitStats', () => {
  it('computes live score, counts, and hit rate including pending darts', () => {
    const session = makeSession()
    const pending = [buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Miss, target)]
    const live = getNinetyNineDartsLiveStats(session.visits, playerId, target, pending)

    expect(live.score).toBe(6)
    expect(live.counts).toEqual({ singles: 1, doubles: 1, trebles: 1, misses: 1 })
    expect(live.hitRate).toBe(75)
    expect(getNinetyNineDartsLiveScoreMetrics(live)).toEqual([
      { label: 'Left', value: '95' },
      { label: 'Points', value: '6' },
      { label: 'Triples', value: '1' },
      { label: 'Singles', value: '1' },
      { label: 'Doubles', value: '1' },
      { label: 'Hit %', value: '75%' },
    ])
  })

  it('omits trebles from bull live metrics', () => {
    const bull = { kind: NinetyNineDartsTargetKind.Bull } as const
    const live = getNinetyNineDartsLiveStats([], playerId, bull, [
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, bull),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bull),
    ])

    expect(getNinetyNineDartsLiveScoreMetrics(live)).toEqual([
      { label: 'Left', value: '97' },
      { label: 'Points', value: '3' },
      { label: 'Singles', value: '1' },
      { label: 'Doubles', value: '1' },
      { label: 'Hit %', value: '100%' },
    ])
  })

  it('computes single-session stats and stat groups', () => {
    const stats = computeNinetyNineDartsSingleSessionStats(makeSession())

    expect(stats).toMatchObject({
      score: 6,
      maxScore: 297,
      hitRate: 100,
      counts: { singles: 1, doubles: 1, trebles: 1, misses: 0 },
      targetLabel: '20',
      isBull: false,
    })
    expect(getNinetyNineDartsStatGroup(target)).toBe(NinetyNineDartsStatGroup.Twenty)
    expect(getNinetyNineDartsStatGroup({ kind: NinetyNineDartsTargetKind.Bull })).toBe(
      NinetyNineDartsStatGroup.Bull,
    )
    expect(getNinetyNineDartsStatGroup({ kind: NinetyNineDartsTargetKind.Number, value: 19 })).toBe(
      NinetyNineDartsStatGroup.Other,
    )
  })
})
