import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import { buildStatTimeline, hasPlottableTimeline } from './statTimelines'

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

describe('statTimelines', () => {
  it('builds a chronological x01 timeline for a selected metric', () => {
    const timeline = buildStatTimeline(
      [
        sampleSession({
          id: 'later',
          completedAt: '2026-01-02T10:00:00.000Z',
          visits: [
            sampleVisit({ visitScore: 100, scoreBefore: 501, scoreAfter: 401 }),
            sampleVisit({
              visitIndex: 1,
              checkout: true,
              visitScore: 50,
              scoreBefore: 50,
              scoreAfter: 0,
            }),
          ],
        }),
        sampleSession({
          id: 'earlier',
          completedAt: '2026-01-01T10:00:00.000Z',
          visits: [sampleVisit({ visitScore: 80, scoreBefore: 501, scoreAfter: 421 })],
        }),
      ],
      {
        scope: { type: 'x01-501' },
        metric: 'threeDartAverage',
        metricLabel: '3-dart average',
        scopeLabel: '501',
      },
    )

    expect(timeline.points.map((point) => point.sessionId)).toEqual(['earlier', 'later'])
    expect(timeline.points[0]?.value).toBe(80)
    expect(timeline.points[1]?.value).toBe(75)
    expect(hasPlottableTimeline(timeline)).toBe(true)
  })

  it('returns null dart values for unchecked x01 legs', () => {
    const timeline = buildStatTimeline([sampleSession({ id: 'unfinished', finishedEarly: true })], {
      scope: { type: 'x01-501' },
      metric: 'avgDarts',
      metricLabel: 'Avg darts',
      scopeLabel: '501',
    })

    expect(timeline.points[0]?.value).toBeNull()
    expect(hasPlottableTimeline(timeline)).toBe(false)
  })
})
