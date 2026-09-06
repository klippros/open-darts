import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { getLatestSessionStartedAt, pickLastPlayedVariant } from './pickLastPlayedVariant'

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

describe('getLatestSessionStartedAt', () => {
  it('returns null for an empty list', () => {
    expect(getLatestSessionStartedAt([])).toBeNull()
  })

  it('returns the latest startedAt', () => {
    expect(
      getLatestSessionStartedAt([
        sampleSession({ startedAt: '2026-01-01T10:00:00.000Z' }),
        sampleSession({ id: 'later', startedAt: '2026-02-01T10:00:00.000Z' }),
        sampleSession({ id: 'mid', startedAt: '2026-01-15T10:00:00.000Z' }),
      ]),
    ).toBe('2026-02-01T10:00:00.000Z')
  })
})

describe('pickLastPlayedVariant', () => {
  it('returns undefined for an empty list', () => {
    const variants: { id: string; lastPlayedAt: string | null }[] = []
    const picked = pickLastPlayedVariant(variants, (variant) => variant.lastPlayedAt)

    expect(picked).toBeUndefined()
  })

  it('picks the variant with the latest lastPlayedAt', () => {
    const variants = [
      { id: 'a', lastPlayedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', lastPlayedAt: '2026-03-01T00:00:00.000Z' },
      { id: 'c', lastPlayedAt: '2026-02-01T00:00:00.000Z' },
    ]
    const picked = pickLastPlayedVariant(variants, (variant) => variant.lastPlayedAt)

    expect(picked?.id).toBe('b')
  })

  it('skips null lastPlayedAt and falls back to the first variant when all are null', () => {
    const withNulls = [
      { id: 'empty', lastPlayedAt: null },
      { id: 'played', lastPlayedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const played = pickLastPlayedVariant(withNulls, (variant) => variant.lastPlayedAt)

    expect(played?.id).toBe('played')

    const allNull = [
      { id: 'a', lastPlayedAt: null },
      { id: 'b', lastPlayedAt: null },
    ]
    const fallback = pickLastPlayedVariant(allNull, (variant) => variant.lastPlayedAt)

    expect(fallback?.id).toBe('a')
  })
})
