import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { numberDart, missDart, outerBullDart } from '../testHelpers'
import type { AroundTheClockTargetAttempt } from '../aroundTheClock/aroundTheClockTargetHits'
import {
  computeAroundTheClockSingleSessionStats,
  aggregatePerTargetStats,
  aggregateAroundTheClockSessionStats,
} from './aroundTheClockStats'

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.AroundTheClock,
  config: { finishOnBull: true, aimMode: AroundTheClockAimMode.Any },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-10T10:00:00.000Z',
  ...overrides,
})

describe('aroundTheClockStats', () => {
  it('aggregates per-target stats from attempts', () => {
    const attempts: AroundTheClockTargetAttempt[] = [
      { targetIndex: 0, label: '1', dartsToHit: 1, hit: true },
      { targetIndex: 0, label: '1', dartsToHit: 3, hit: true },
      { targetIndex: 1, label: '2', dartsToHit: null, hit: false },
      { targetIndex: 1, label: '2', dartsToHit: 2, hit: true },
    ]

    const targets = aggregatePerTargetStats(attempts)

    expect(targets[0]).toMatchObject({
      label: '1',
      attemptCount: 2,
      hitCount: 2,
      avgDartsPerHit: 2,
      bestDarts: 1,
    })
    expect(targets[1]).toMatchObject({
      label: '2',
      attemptCount: 2,
      hitCount: 1,
      avgDartsPerHit: 2,
      bestDarts: 2,
    })
    expect(targets[2]).toMatchObject({
      label: '3',
      attemptCount: 0,
      hitCount: 0,
      avgDartsPerHit: null,
      bestDarts: null,
    })
  })

  it('computes avg darts per field from total darts and completed fields', () => {
    const stats = computeAroundTheClockSingleSessionStats(
      sampleSession({
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts: [
              numberDart(1, DartMultiplier.Single),
              numberDart(2, DartMultiplier.Single),
              numberDart(3, DartMultiplier.Single),
            ],
            visitScore: 6,
            scoreBefore: 0,
            scoreAfter: 3,
            bust: false,
            checkout: false,
          },
        ],
      }),
    )

    expect(stats).toMatchObject({
      dartsThrown: 3,
      fieldsCompleted: 3,
      totalFields: 21,
      avgDartsPerField: 1,
      isComplete: false,
      currentTargetLabel: '4',
    })
  })

  it('computes avg darts per field for a partial session', () => {
    const stats = computeAroundTheClockSingleSessionStats(
      sampleSession({
        finishedEarly: true,
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts: [
              numberDart(1, DartMultiplier.Single),
              numberDart(2, DartMultiplier.Single),
              numberDart(3, DartMultiplier.Single),
            ],
            visitScore: 6,
            scoreBefore: 0,
            scoreAfter: 3,
            bust: false,
            checkout: false,
          },
          {
            visitIndex: 1,
            playerId: 'player-1',
            darts: [missDart(), missDart()],
            visitScore: 0,
            scoreBefore: 3,
            scoreAfter: 3,
            bust: false,
            checkout: false,
          },
        ],
      }),
    )

    expect(stats).toMatchObject({
      dartsThrown: 5,
      fieldsCompleted: 3,
      avgDartsPerField: 5 / 3,
      isComplete: false,
      currentTargetLabel: '4',
    })
  })

  it('computes avg darts per field for a completed session', () => {
    const darts = [
      ...Array.from({ length: 20 }, (_, index) => numberDart(index + 1, DartMultiplier.Single)),
      outerBullDart(DartMultiplier.Single),
    ]

    const stats = computeAroundTheClockSingleSessionStats(
      sampleSession({
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts,
            visitScore: 21,
            scoreBefore: 0,
            scoreAfter: 21,
            bust: false,
            checkout: true,
          },
        ],
      }),
    )

    expect(stats).toMatchObject({
      dartsThrown: 21,
      fieldsCompleted: 21,
      avgDartsPerField: 1,
      isComplete: true,
    })
  })

  it('aggregates best darts per field as the lowest session average', () => {
    const sessions = [
      sampleSession({
        id: 'session-complete',
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts: [
              numberDart(1, DartMultiplier.Single),
              numberDart(2, DartMultiplier.Single),
              numberDart(3, DartMultiplier.Single),
              numberDart(4, DartMultiplier.Single),
            ],
            visitScore: 10,
            scoreBefore: 0,
            scoreAfter: 4,
            bust: false,
            checkout: true,
          },
        ],
      }),
      sampleSession({
        id: 'session-partial',
        finishedEarly: true,
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts: [numberDart(1, DartMultiplier.Single), numberDart(2, DartMultiplier.Single)],
            visitScore: 3,
            scoreBefore: 0,
            scoreAfter: 2,
            bust: false,
            checkout: false,
          },
        ],
      }),
    ]

    const aggregated = aggregateAroundTheClockSessionStats(sessions, AroundTheClockAimMode.Any)

    expect(aggregated).toMatchObject({
      avgDartsPerField: (1 + 1) / 2,
      bestDartsPerField: 1,
    })
  })
})
