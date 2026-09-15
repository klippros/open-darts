import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { GameModeId, GameStatus } from '../types/gameMode'
import type { GameSession } from '../types/gameSession'
import { PlayerKind } from '../types/player'
import type { Visit } from '../types/visit'
import { applyAsyncMatchResultToSession, resolveAsyncMatchResult } from './asyncMatchResult'
import { numberDart } from '../testHelpers'

const visit = (
  playerId: string,
  visitIndex: number,
  visitScore: number,
  overrides: Partial<Visit> = {},
): Visit => ({
  visitIndex,
  playerId,
  darts: [numberDart(20, DartMultiplier.Single)],
  visitScore,
  scoreBefore: 501 - visitIndex * 20,
  scoreAfter: 481 - visitIndex * 20,
  bust: false,
  checkout: false,
  ...overrides,
})

const playerVisits = (playerId: string, count: number): Visit[] =>
  Array.from({ length: count }, (_, index) => visit(playerId, index, 20))

describe('resolveAsyncMatchResult', () => {
  it('keeps only visits that would have been thrown before the starter won', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 3) },
        { playerId: 'p2', visits: playerVisits('p2', 4) },
      ],
    })

    expect(result.winnerId).toBe('p1')
    expect(result.visits.filter((entry) => entry.playerId === 'p1')).toHaveLength(3)
    expect(result.visits.filter((entry) => entry.playerId === 'p2')).toHaveLength(2)
    expect(result.visits.every((entry) => entry.voided !== true)).toBe(true)
  })

  it('awards an equal-visit match to the starter and drops the other last visit', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 3) },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p1')
    expect(result.visits.filter((entry) => entry.playerId === 'p1')).toHaveLength(3)
    expect(result.visits.filter((entry) => entry.playerId === 'p2')).toHaveLength(2)
  })

  it('keeps matching visit counts when the other player finished first', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 4) },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p2')
    expect(result.visits.filter((entry) => entry.playerId === 'p1')).toHaveLength(3)
    expect(result.visits.filter((entry) => entry.playerId === 'p2')).toHaveLength(3)
  })

  it('treats the darts owner as starter even when they are second in the players array', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p2',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 4) },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p2')
    expect(result.visits[0]?.playerId).toBe('p2')
    expect(result.visits.filter((entry) => entry.playerId === 'p1')).toHaveLength(2)
  })

  it('ignores already-voided visits when counting and assembling', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        {
          playerId: 'p1',
          visits: [visit('p1', 0, 20), visit('p1', 1, 180, { voided: true }), visit('p1', 2, 20)],
        },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p1')
    expect(result.visits.filter((entry) => entry.playerId === 'p1')).toHaveLength(2)
    expect(result.visits.filter((entry) => entry.playerId === 'p2')).toHaveLength(1)
    expect(result.visits.some((entry) => entry.visitScore === 180)).toBe(false)
  })
})

describe('applyAsyncMatchResultToSession', () => {
  const session = (overrides: Partial<GameSession> = {}): GameSession => ({
    id: 'session-1',
    mode: GameModeId.X01,
    config: { startScore: 501, doubleIn: false, doubleOut: true },
    players: [
      { id: 'p1', name: 'Alice', kind: PlayerKind.Human },
      { id: 'p2', name: 'Bob', kind: PlayerKind.Remote },
    ],
    visits: [visit('p1', 0, 60, { legIndex: 1 })],
    status: GameStatus.InProgress,
    startedAt: '2026-01-01T00:00:00.000Z',
    matchProgress: {
      legsToWin: 1,
      startingPlayerIndex: 0,
      currentLeg: 1,
      legWins: { p1: 0, p2: 0 },
    },
    ...overrides,
  })

  it('appends counting async visits onto the existing session for summary', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 1) },
        { playerId: 'p2', visits: playerVisits('p2', 2) },
      ],
    })
    const completed = applyAsyncMatchResultToSession(session(), result, '2026-01-01T00:20:00.000Z')

    expect(completed.status).toBe(GameStatus.Completed)
    expect(completed.completedAt).toBe('2026-01-01T00:20:00.000Z')
    expect(completed.matchProgress?.legWins).toEqual({ p1: 1, p2: 0 })
    expect(completed.visits.map((entry) => entry.playerId)).toEqual(['p1', 'p1'])
    expect(completed.visits.map((entry) => entry.visitIndex)).toEqual([0, 1])
    expect(completed.visits[1]?.legIndex).toBe(1)
    expect(completed.visits.every((entry) => entry.voided !== true)).toBe(true)
  })
})
