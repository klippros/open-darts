import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { SyncStatus } from '../../types/auth'
import { loadStoredSessions, saveStoredSession } from '../storage/gameStore'
import type { StorageAdapter } from '../storage/localStorageAdapter'
import { StorageKey } from '../storage/storageKeys'
import {
  clearSyncedLocalSessionData,
  createSupabaseSessionGateway,
  flushPendingSessionSync,
  queueCompletedSessionSync,
  retrySessionSync,
  startSessionSyncWithGateway,
  stopSessionSync,
  synchronizeSessions,
} from './sessionSync'
import type { SessionSyncGateway } from './sessionSync'

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

const createLocalStorageMock = () => {
  const storage = createMemoryStorage()

  return {
    ...storage,
    clear: () => {
      storage.data.clear()
    },
    key: (index: number) => [...storage.data.keys()][index] ?? null,
    get length() {
      return storage.data.size
    },
  }
}

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

beforeEach(() => {
  stopSessionSync()
  vi.stubGlobal('localStorage', createLocalStorageMock())
})

describe('synchronizeSessions', () => {
  it('merges local progress and is idempotent after the remote upsert', async () => {
    const storage = createMemoryStorage()
    const local = session()
    let remote: GameSession[] = []
    const upsertSessions = vi.fn(async (sessions: GameSession[]) => {
      remote = sessions
    })
    const gateway: SessionSyncGateway = {
      loadSessions: async () => remote,
      upsertSessions,
      deleteSessions: async () => undefined,
    }
    saveStoredSession(local, storage)

    await synchronizeSessions(gateway, storage)
    await synchronizeSessions(gateway, storage)

    expect(loadStoredSessions(storage)).toEqual([local])
    expect(upsertSessions).toHaveBeenCalledTimes(1)
    expect(storage.getItem(StorageKey.SyncQueue)).toBeNull()
  })

  it('keeps local progress queued when an upload fails', async () => {
    const storage = createMemoryStorage()
    const local = session()
    const gateway: SessionSyncGateway = {
      loadSessions: async () => [],
      upsertSessions: async () => {
        throw new Error('offline')
      },
      deleteSessions: async () => undefined,
    }
    saveStoredSession(local, storage)

    await expect(synchronizeSessions(gateway, storage)).rejects.toThrow('offline')

    expect(loadStoredSessions(storage)).toEqual([local])
    expect(JSON.parse(storage.getItem(StorageKey.SyncQueue) ?? '[]')).toEqual([local.id])
  })
})

describe('completed-session queue', () => {
  it('does not queue remote work while anonymous', () => {
    queueCompletedSessionSync(session())

    expect(localStorage.getItem(StorageKey.SyncQueue)).toBeNull()
  })

  it('uploads completed sessions after authenticated sync starts', async () => {
    const upsertSessions = vi.fn(async () => undefined)
    const statusChanges: SyncStatus[] = []
    const gateway: SessionSyncGateway = {
      loadSessions: async () => [],
      upsertSessions,
      deleteSessions: async () => undefined,
    }

    await startSessionSyncWithGateway(gateway, (status) => {
      statusChanges.push(status)
    })
    const completed = session()
    saveStoredSession(completed)
    queueCompletedSessionSync(completed)
    await retrySessionSync()

    expect(upsertSessions).toHaveBeenCalledWith([completed])
    expect(statusChanges).toContain(SyncStatus.Synced)
    expect(localStorage.getItem(StorageKey.SyncQueue)).toBeNull()
  })
})

describe('clearSyncedLocalSessionData', () => {
  it('removes completed sessions that have been synced', () => {
    const storage = createMemoryStorage()
    const completed = session()
    const inProgress = session({
      id: 'session-2',
      status: GameStatus.InProgress,
      completedAt: undefined,
    })
    saveStoredSession(completed, storage)
    saveStoredSession(inProgress, storage)
    storage.setItem(StorageKey.LastSyncAt, '2026-01-01T00:00:00.000Z')

    clearSyncedLocalSessionData(storage)

    expect(loadStoredSessions(storage)).toEqual([inProgress])
    expect(storage.getItem(StorageKey.SyncQueue)).toBeNull()
    expect(storage.getItem(StorageKey.SyncDeleteQueue)).toBeNull()
    expect(storage.getItem(StorageKey.LastSyncAt)).toBeNull()
  })

  it('keeps completed sessions that are still waiting to upload', () => {
    const storage = createMemoryStorage()
    const completed = session()
    saveStoredSession(completed, storage)
    storage.setItem(StorageKey.SyncQueue, JSON.stringify([completed.id]))

    clearSyncedLocalSessionData(storage)

    expect(loadStoredSessions(storage)).toEqual([completed])
    expect(JSON.parse(storage.getItem(StorageKey.SyncQueue) ?? '[]')).toEqual([completed.id])
  })
})

describe('flushPendingSessionSync', () => {
  it('uploads queued sessions before sign-out cleanup', async () => {
    const upsertSessions = vi.fn(async () => undefined)
    const gateway: SessionSyncGateway = {
      loadSessions: async () => [],
      upsertSessions,
      deleteSessions: async () => undefined,
    }

    await startSessionSyncWithGateway(gateway, () => undefined)
    const completed = session()
    saveStoredSession(completed)
    localStorage.setItem(StorageKey.SyncQueue, JSON.stringify([completed.id]))

    await flushPendingSessionSync()
    clearSyncedLocalSessionData()

    expect(upsertSessions).toHaveBeenCalledWith([completed])
    expect(loadStoredSessions()).toEqual([])
  })
})

describe('Supabase ownership boundary', () => {
  it('does not send a client-provided user id when upserting', async () => {
    const rpc = vi.fn(async (_name: string, _arguments: Record<string, unknown>) => ({
      data: null,
      error: null,
    }))
    const client = { rpc } as unknown as SupabaseClient
    const gateway = createSupabaseSessionGateway(client)
    const completed = session()

    await gateway.upsertSessions([completed])

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc.mock.calls[0]?.[0]).toBe('upsert_game_session')
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('user_id')
  })
})
