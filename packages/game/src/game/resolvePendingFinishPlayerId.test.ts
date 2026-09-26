import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import type { GameSession } from '../types/gameSession'
import { resolvePendingFinishPlayerId } from './resolvePendingFinishPlayerId'

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'match-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [
    { id: 'user-a', name: 'Player 1', kind: PlayerKind.Remote },
    { id: 'user-b', name: 'Player 2', kind: PlayerKind.Remote },
  ],
  visits: [],
  status: GameStatus.InProgress,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('resolvePendingFinishPlayerId', () => {
  it('returns the last non-voided visit player', () => {
    const session = sampleSession({
      visits: [
        {
          visitIndex: 0,
          playerId: 'user-a',
          darts: [],
          visitScore: 60,
          scoreBefore: 501,
          scoreAfter: 441,
          bust: false,
          checkout: false,
        },
        {
          visitIndex: 1,
          playerId: 'user-b',
          darts: [],
          visitScore: 40,
          scoreBefore: 40,
          scoreAfter: 0,
          bust: false,
          checkout: true,
        },
        {
          visitIndex: 2,
          playerId: 'user-a',
          darts: [],
          visitScore: 0,
          scoreBefore: 441,
          scoreAfter: 441,
          bust: false,
          checkout: false,
          voided: true,
        },
      ],
    })

    expect(resolvePendingFinishPlayerId(session)).toBe('user-b')
  })

  it('returns null when there are no counting visits', () => {
    expect(resolvePendingFinishPlayerId(sampleSession())).toBeNull()
  })
})
