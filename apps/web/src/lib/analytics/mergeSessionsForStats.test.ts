import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { mergeSessionsForStats } from './mergeSessionsForStats'

const session = (id: string, name: string): GameSession => ({
  id,
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name, kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:10:00.000Z',
})

describe('mergeSessionsForStats', () => {
  it('includes both local and online sessions', () => {
    const merged = mergeSessionsForStats(
      [session('local-1', 'Local')],
      [session('online-1', 'Online')],
    )

    expect(merged.map((entry) => entry.id).sort()).toEqual(['local-1', 'online-1'])
  })

  it('prefers the local session when ids collide', () => {
    const merged = mergeSessionsForStats([session('same', 'Local')], [session('same', 'Online')])

    expect(merged).toHaveLength(1)
    expect(merged[0]?.players[0]?.name).toBe('Local')
  })
})
