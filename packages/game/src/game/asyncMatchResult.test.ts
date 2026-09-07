import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import type { Visit } from '../types/visit'
import { resolveAsyncMatchResult } from './asyncMatchResult'
import { numberDart } from '../testHelpers'

const visit = (playerId: string, visitIndex: number, visitScore: number): Visit => ({
  visitIndex,
  playerId,
  darts: [numberDart(20, DartMultiplier.Single)],
  visitScore,
  scoreBefore: 501 - visitIndex * 20,
  scoreAfter: 481 - visitIndex * 20,
  bust: false,
  checkout: false,
})

const playerVisits = (playerId: string, count: number): Visit[] =>
  Array.from({ length: count }, (_, index) => visit(playerId, index, 20))

describe('resolveAsyncMatchResult', () => {
  it('awards the win to the player with fewer counting visits', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 3) },
        { playerId: 'p2', visits: playerVisits('p2', 4) },
      ],
    })

    expect(result.winnerId).toBe('p1')
    expect(
      result.visits.filter((entry) => entry.playerId === 'p2' && entry.voided === true),
    ).toHaveLength(2)
    expect(
      result.visits.filter((entry) => entry.playerId === 'p2' && entry.voided !== true),
    ).toHaveLength(2)
  })

  it('breaks an equal-visit tie in favor of the darts owner', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p1',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 3) },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p1')
    expect(result.visits.at(-1)).toMatchObject({ playerId: 'p2', voided: true })
    expect(result.visits.filter((entry) => entry.voided === true)).toHaveLength(1)
  })

  it('voids the second player extra visits when the darts owner did not start', () => {
    const result = resolveAsyncMatchResult({
      dartsOwnerId: 'p2',
      players: [
        { playerId: 'p1', visits: playerVisits('p1', 4) },
        { playerId: 'p2', visits: playerVisits('p2', 3) },
      ],
    })

    expect(result.winnerId).toBe('p2')
    expect(result.visits[0]?.playerId).toBe('p2')
    expect(
      result.visits.filter((entry) => entry.playerId === 'p1' && entry.voided === true),
    ).toHaveLength(2)
  })
})
