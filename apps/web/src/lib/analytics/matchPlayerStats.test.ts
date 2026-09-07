import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import {
  computeLegPlayerStats,
  computeMatchPlayerStats,
  computePlayerStatsForVisits,
} from './matchPlayerStats'
import { getPlayedLegNumbers } from '../game/matchLegs'

const visit = (
  overrides: Partial<GameSession['visits'][number]> = {},
): GameSession['visits'][number] => ({
  visitIndex: 0,
  playerId: 'player-1',
  darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
  visitScore: 120,
  scoreBefore: 501,
  scoreAfter: 381,
  bust: false,
  checkout: false,
  ...overrides,
})

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [
    { id: 'player-1', name: 'Alice', kind: PlayerKind.Human },
    { id: 'player-2', name: 'Bob', kind: PlayerKind.Human },
  ],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-10T10:00:00.000Z',
  ...overrides,
})

describe('matchPlayerStats', () => {
  it('aggregates visit score stats for a player', () => {
    const stats = computePlayerStatsForVisits(
      [
        visit({ visitScore: 180, scoreBefore: 501, scoreAfter: 321 }),
        visit({
          visitIndex: 1,
          visitScore: 0,
          scoreBefore: 321,
          scoreAfter: 321,
          bust: true,
          darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
        }),
        visit({
          visitIndex: 2,
          visitScore: 121,
          scoreBefore: 121,
          scoreAfter: 0,
          checkout: true,
          darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
        }),
      ],
      { doubleIn: false, doubleOut: true },
    )

    expect(stats.thrown180).toBe(1)
    expect(stats.thrown140Plus).toBe(0)
    expect(stats.thrown100Plus).toBe(1)
    expect(stats.highestVisit).toBe(180)
    expect(stats.highestCheckout).toBe(121)
    expect(stats.checkouts100Plus).toBe(1)
    expect(stats.threeDartAverage).toBeCloseTo(100.33, 1)
    expect(stats.threeDartAverageUntil170).toBe(90)
  })

  it('excludes checkout-range visits from the average until 170', () => {
    const stats = computePlayerStatsForVisits(
      [
        visit({ visitScore: 100, scoreBefore: 501, scoreAfter: 401 }),
        visit({ visitIndex: 1, visitScore: 80, scoreBefore: 401, scoreAfter: 321 }),
        visit({ visitIndex: 2, visitScore: 50, scoreBefore: 160, scoreAfter: 110 }),
        visit({
          visitIndex: 3,
          visitScore: 110,
          scoreBefore: 110,
          scoreAfter: 0,
          checkout: true,
        }),
      ],
      { doubleIn: false, doubleOut: true },
    )

    expect(stats.threeDartAverage).toBe(85)
    expect(stats.threeDartAverageUntil170).toBe(90)
  })

  it('counts 180, 140+, and 100+ in exclusive tiers', () => {
    const stats = computePlayerStatsForVisits(
      [
        visit({ visitScore: 180 }),
        visit({ visitIndex: 1, visitScore: 150 }),
        visit({ visitIndex: 2, visitScore: 120 }),
        visit({ visitIndex: 3, visitScore: 99 }),
      ],
      { doubleIn: false, doubleOut: true },
    )

    expect(stats.thrown180).toBe(1)
    expect(stats.thrown140Plus).toBe(1)
    expect(stats.thrown100Plus).toBe(1)
  })

  it('returns stats per player for a match', () => {
    const statsByPlayer = computeMatchPlayerStats(
      sampleSession({
        visits: [
          visit({ playerId: 'player-1', visitScore: 180, scoreBefore: 501, scoreAfter: 321 }),
          visit({
            visitIndex: 1,
            playerId: 'player-2',
            visitScore: 100,
            scoreBefore: 501,
            scoreAfter: 401,
            darts: [numberDart(20, DartMultiplier.Triple)],
          }),
        ],
      }),
    )

    expect(statsByPlayer['player-1']?.thrown180).toBe(1)
    expect(statsByPlayer['player-2']?.thrown180).toBe(0)
    expect(statsByPlayer['player-2']?.thrown100Plus).toBe(1)
  })

  it('filters stats by leg', () => {
    const statsByPlayer = computeLegPlayerStats(
      sampleSession({
        visits: [
          visit({
            legIndex: 1,
            playerId: 'player-1',
            visitScore: 180,
            scoreBefore: 501,
            scoreAfter: 321,
          }),
          visit({
            visitIndex: 1,
            legIndex: 2,
            playerId: 'player-1',
            visitScore: 140,
            scoreBefore: 501,
            scoreAfter: 361,
            darts: [
              numberDart(20, DartMultiplier.Triple),
              numberDart(20, DartMultiplier.Triple),
              numberDart(20, DartMultiplier.Double),
            ],
          }),
        ],
      }),
      2,
    )

    expect(statsByPlayer['player-1']?.thrown180).toBe(0)
    expect(statsByPlayer['player-1']?.thrown140Plus).toBe(1)
    expect(statsByPlayer['player-1']?.highestVisit).toBe(140)
  })

  it('lists played leg numbers', () => {
    expect(
      getPlayedLegNumbers([
        visit({ legIndex: 1 }),
        visit({ visitIndex: 1, legIndex: 2 }),
        visit({ visitIndex: 2, legIndex: 1 }),
      ]),
    ).toEqual([1, 2])
  })
})
