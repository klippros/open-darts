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

    expect(timeline.pointUnitLabel).toBe('leg')
    expect(timeline.points.map((point) => point.sessionId)).toEqual([
      'earlier:leg:1',
      'later:leg:1',
    ])
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

  it('builds per-leg thrown 180 counts', () => {
    const timeline = buildStatTimeline(
      [
        sampleSession({
          id: 'without-180',
          completedAt: '2026-01-01T10:00:00.000Z',
          visits: [sampleVisit({ visitScore: 60, scoreBefore: 501, scoreAfter: 441 })],
        }),
        sampleSession({
          id: 'with-180',
          completedAt: '2026-01-02T10:00:00.000Z',
          visits: [
            sampleVisit({ visitScore: 180, scoreBefore: 501, scoreAfter: 321 }),
            sampleVisit({
              visitIndex: 1,
              checkout: true,
              visitScore: 40,
              scoreBefore: 40,
              scoreAfter: 0,
              darts: [numberDart(20, DartMultiplier.Double)],
            }),
          ],
        }),
      ],
      {
        scope: { type: 'x01-501' },
        metric: 'thrown180',
        metricLabel: '180',
        scopeLabel: '501',
      },
    )

    expect(timeline.points[0]?.value).toBe(0)
    expect(timeline.points[1]?.value).toBe(1)
  })

  it('emits one timeline point per leg in a multi-leg match', () => {
    const timeline = buildStatTimeline(
      [
        sampleSession({
          id: 'best-of-three',
          completedAt: '2026-01-03T10:00:00.000Z',
          visits: [
            sampleVisit({
              visitScore: 100,
              scoreBefore: 501,
              scoreAfter: 401,
              legIndex: 1,
            }),
            sampleVisit({
              visitIndex: 1,
              checkout: true,
              visitScore: 100,
              scoreBefore: 100,
              scoreAfter: 0,
              legIndex: 1,
            }),
            sampleVisit({
              visitIndex: 2,
              visitScore: 40,
              scoreBefore: 501,
              scoreAfter: 461,
              legIndex: 2,
            }),
            sampleVisit({
              visitIndex: 3,
              checkout: true,
              visitScore: 40,
              scoreBefore: 40,
              scoreAfter: 0,
              legIndex: 2,
            }),
          ],
        }),
      ],
      {
        scope: { type: 'x01-501' },
        metric: 'threeDartAverage',
        metricLabel: '3-dart average',
        scopeLabel: '501',
      },
    )

    expect(timeline.points).toHaveLength(2)
    expect(timeline.points.map((point) => point.sessionId)).toEqual([
      'best-of-three:leg:1',
      'best-of-three:leg:2',
    ])
    expect(timeline.points[0]?.value).toBe(100)
    expect(timeline.points[1]?.value).toBe(40)
    expect(timeline.points[0]?.sessionLabel).toBe('501 · Leg 1')
    expect(timeline.points[1]?.sessionLabel).toBe('501 · Leg 2')
  })

  it('builds bob27 doubles-per-game timeline points', () => {
    const timeline = buildStatTimeline(
      [
        sampleSession({
          id: 'bob-low',
          mode: GameModeId.Bob27,
          config: { startScore: 27 },
          completedAt: '2026-01-01T10:00:00.000Z',
          visits: [
            sampleVisit({ metadata: { targetLabel: 'D1', hit: true, hitCount: 1 } }),
            sampleVisit({
              visitIndex: 1,
              metadata: { targetLabel: 'D2', hit: false, hitCount: 0 },
            }),
          ],
        }),
        sampleSession({
          id: 'bob-high',
          mode: GameModeId.Bob27,
          config: { startScore: 27 },
          completedAt: '2026-01-02T10:00:00.000Z',
          visits: [
            sampleVisit({ metadata: { targetLabel: 'D1', hit: true, hitCount: 3 } }),
            sampleVisit({
              visitIndex: 1,
              metadata: { targetLabel: 'Bull', hit: true, hitCount: 2 },
            }),
          ],
        }),
      ],
      {
        scope: { type: 'practice-bob27' },
        metric: 'avgDoublesPerGame',
        metricLabel: 'Doubles / game',
        scopeLabel: "Bob's 27",
      },
    )

    expect(timeline.format).toBe('average')
    expect(timeline.points.map((point) => point.value)).toEqual([1, 5])
  })

  it('builds 121 checkouts-per-game timeline points', () => {
    const timeline = buildStatTimeline(
      [
        sampleSession({
          id: '121-low',
          mode: GameModeId.OneTwentyOne,
          config: {
            startScore: 121,
            increment: 1,
            startingLives: 3,
            maxVisitsPerTarget: 3,
            doubleOut: true,
          },
          completedAt: '2026-01-01T10:00:00.000Z',
          visits: [
            sampleVisit({ checkout: true, scoreBefore: 121, scoreAfter: 122, visitScore: 121 }),
          ],
        }),
        sampleSession({
          id: '121-high',
          mode: GameModeId.OneTwentyOne,
          config: {
            startScore: 121,
            increment: 1,
            startingLives: 3,
            maxVisitsPerTarget: 3,
            doubleOut: true,
          },
          completedAt: '2026-01-02T10:00:00.000Z',
          visits: [
            sampleVisit({ checkout: true, scoreBefore: 121, scoreAfter: 122, visitScore: 121 }),
            sampleVisit({
              visitIndex: 1,
              checkout: true,
              scoreBefore: 140,
              scoreAfter: 141,
              visitScore: 140,
            }),
          ],
        }),
      ],
      {
        scope: { type: 'practice-checkout', mode: GameModeId.OneTwentyOne },
        metric: 'bestCheckoutsPerGame',
        metricLabel: 'Checkouts / game',
        scopeLabel: '121',
      },
    )

    expect(timeline.format).toBe('integer')
    expect(timeline.points.map((point) => point.value)).toEqual([1, 2])
  })
})
