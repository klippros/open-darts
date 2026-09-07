import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { mergeCompletedSessions } from './mergeSessions'

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:10:00.000Z',
  ...overrides,
})

describe('mergeCompletedSessions', () => {
  it('uploads local-only sessions and downloads remote-only sessions', () => {
    const local = session({ id: 'local' })
    const remote = session({ id: 'remote' })

    const result = mergeCompletedSessions([local], [remote])

    expect(result.sessions).toEqual([remote, local])
    expect(result.sessionsToUpload).toEqual([local])
  })

  it('keeps newer remote data without uploading the older local copy', () => {
    const local = session({ completedAt: '2026-01-01T00:05:00.000Z' })
    const remote = session({ completedAt: '2026-01-01T00:15:00.000Z' })

    const result = mergeCompletedSessions([local], [remote])

    expect(result.sessions).toEqual([remote])
    expect(result.sessionsToUpload).toEqual([])
  })

  it('uploads a newer local version of the same session', () => {
    const local = session({ completedAt: '2026-01-01T00:15:00.000Z' })
    const remote = session({ completedAt: '2026-01-01T00:05:00.000Z' })

    const result = mergeCompletedSessions([local], [remote])

    expect(result.sessions).toEqual([local])
    expect(result.sessionsToUpload).toEqual([local])
  })

  it('uses visit count as the tie-breaker and ignores in-progress sessions', () => {
    const visit = {
      visitIndex: 0,
      playerId: 'player-1',
      darts: [],
      visitScore: 60,
      scoreBefore: 501,
      scoreAfter: 441,
      bust: false,
      checkout: false,
    }
    const local = session({ visits: [visit] })
    const remote = session()
    const inProgress = session({ id: 'active', status: GameStatus.InProgress })

    const result = mergeCompletedSessions([local, inProgress], [remote])

    expect(result.sessions).toEqual([local])
    expect(result.sessionsToUpload).toEqual([local])
  })
})
