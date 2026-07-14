import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { numberDart, bullDart } from '../testHelpers'
import { computePracticeStats } from './practiceStats'

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
  completedAt: '2026-01-10T10:00:00.000Z',
  ...overrides,
})

describe('practiceStats', () => {
  it('summarizes checkout practice modes by visit checkout rate', () => {
    const stats = computePracticeStats([
      sampleSession({
        mode: GameModeId.OneTwentyOne,
        config: { startScore: 121, increment: 20, doubleOut: true },
        visits: [
          sampleVisit({ checkout: true, scoreAfter: 141, visitScore: 121 }),
          sampleVisit({
            visitIndex: 1,
            checkout: false,
            scoreAfter: 121,
            visitScore: 0,
            bust: true,
          }),
        ],
      }),
    ])

    expect(stats.checkout).toEqual([
      expect.objectContaining({
        mode: GameModeId.OneTwentyOne,
        checkoutRate: 50,
        gameCount: 1,
        visitCount: 2,
      }),
    ])
  })

  it('summarizes bob27 separately from around the clock', () => {
    const stats = computePracticeStats([
      sampleSession({
        mode: GameModeId.Bob27,
        config: { startScore: 27 },
        visits: [sampleVisit({ scoreAfter: 54, visitScore: 27 })],
      }),
    ])

    expect(stats.other).toEqual([
      expect.objectContaining({
        mode: GameModeId.Bob27,
        gameCount: 1,
        avgFinalScore: 54,
      }),
    ])
  })

  it('summarizes around the clock per aim mode with per-target stats', () => {
    const stats = computePracticeStats([
      sampleSession({
        mode: GameModeId.AroundTheClock,
        config: { finishOnBull: true, aimMode: AroundTheClockAimMode.Any },
        visits: [
          sampleVisit({
            scoreBefore: 0,
            scoreAfter: 1,
            darts: [
              numberDart(1, DartMultiplier.Single),
              numberDart(1, DartMultiplier.Single),
              numberDart(1, DartMultiplier.Single),
            ],
          }),
          sampleVisit({
            visitIndex: 1,
            checkout: true,
            scoreBefore: 20,
            scoreAfter: 21,
            darts: [bullDart()],
          }),
        ],
      }),
      sampleSession({
        id: 'early',
        mode: GameModeId.AroundTheClock,
        config: { finishOnBull: true, aimMode: AroundTheClockAimMode.Any },
        finishedEarly: true,
        visits: [
          sampleVisit({
            darts: [numberDart(1, DartMultiplier.Single), numberDart(1, DartMultiplier.Single)],
          }),
        ],
      }),
      sampleSession({
        id: 'doubles',
        mode: GameModeId.AroundTheClock,
        config: { finishOnBull: true, aimMode: AroundTheClockAimMode.Doubles },
        finishedEarly: true,
        visits: [
          sampleVisit({
            scoreBefore: 0,
            scoreAfter: 0,
            darts: [numberDart(1, DartMultiplier.Single)],
          }),
        ],
      }),
    ])

    const anyStats = stats.other.find(
      (entry) =>
        entry.mode === GameModeId.AroundTheClock &&
        'aimMode' in entry &&
        entry.aimMode === AroundTheClockAimMode.Any,
    )
    const doublesStats = stats.other.find(
      (entry) =>
        entry.mode === GameModeId.AroundTheClock &&
        'aimMode' in entry &&
        entry.aimMode === AroundTheClockAimMode.Doubles,
    )

    expect(anyStats).toEqual(
      expect.objectContaining({
        mode: GameModeId.AroundTheClock,
        aimMode: AroundTheClockAimMode.Any,
        gameCount: 2,
        completedCount: 1,
        completionRate: 50,
        avgDartsFullRun: 4,
        bestDartsFullRun: 4,
      }),
    )
    expect(anyStats && 'targets' in anyStats && anyStats.targets[0]).toMatchObject({
      label: '1',
      attemptCount: 1,
      hitCount: 1,
      bestDarts: 1,
    })
    expect(doublesStats).toEqual(
      expect.objectContaining({
        aimMode: AroundTheClockAimMode.Doubles,
        gameCount: 1,
        completedCount: 0,
        completionRate: 0,
      }),
    )
  })

  it('groups legacy sessions without aim mode as any', () => {
    const stats = computePracticeStats([
      sampleSession({
        mode: GameModeId.AroundTheClock,
        config: { finishOnBull: true },
        visits: [
          sampleVisit({
            scoreBefore: 0,
            scoreAfter: 1,
            darts: [numberDart(1, DartMultiplier.Single)],
          }),
        ],
      }),
    ])

    expect(stats.other).toEqual([
      expect.objectContaining({
        mode: GameModeId.AroundTheClock,
        aimMode: AroundTheClockAimMode.Any,
        gameCount: 1,
      }),
    ])
  })
})
