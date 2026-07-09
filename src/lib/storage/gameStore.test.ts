import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import { PlayerKind } from '../../types/player'
import {
  clearActiveSnapshot,
  loadActiveSnapshot,
  loadStoredSessions,
  saveActiveSnapshot,
  saveStoredSession,
} from './gameStore'
import type { StorageAdapter } from './localStorageAdapter'
import { StorageKey } from './storageKeys'

const createMemoryStorage = (): StorageAdapter & { data: Map<string, string> } => {
  const data = new Map<string, string>()

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.InProgress,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const sampleSnapshot = (overrides: Partial<ActiveGameSnapshot> = {}): ActiveGameSnapshot => ({
  session: sampleSession(),
  turnIndex: 0,
  pendingDarts: [],
  savedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('gameStore', () => {
  it('saves and loads completed sessions', () => {
    const storage = createMemoryStorage()
    const session = sampleSession({ status: GameStatus.Completed })

    saveStoredSession(session, storage)

    expect(loadStoredSessions(storage)).toEqual([session])
  })

  it('upserts sessions by id', () => {
    const storage = createMemoryStorage()
    const first = sampleSession({ visits: [] })
    const updated = sampleSession({
      status: GameStatus.Completed,
      visits: [
        {
          visitIndex: 0,
          playerId: 'player-1',
          darts: [],
          visitScore: 0,
          scoreBefore: 501,
          scoreAfter: 501,
          bust: false,
          checkout: false,
        },
      ],
    })

    saveStoredSession(first, storage)
    saveStoredSession(updated, storage)

    expect(loadStoredSessions(storage)).toEqual([updated])
  })

  it('saves and clears the active snapshot', () => {
    const storage = createMemoryStorage()
    const snapshot = sampleSnapshot()

    saveActiveSnapshot(snapshot, storage)
    expect(loadActiveSnapshot(storage)).toEqual(snapshot)

    clearActiveSnapshot(storage)
    expect(loadActiveSnapshot(storage)).toBeNull()
    expect(storage.data.has(StorageKey.ActiveSession)).toBe(false)
  })

  it('ignores invalid stored JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Sessions, '{not-json')
    storage.setItem(StorageKey.ActiveSession, '{"turnIndex":0}')

    expect(loadStoredSessions(storage)).toEqual([])
    expect(loadActiveSnapshot(storage)).toBeNull()
  })
})
