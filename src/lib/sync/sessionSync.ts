import type { SupabaseClient } from '@supabase/supabase-js'
import { GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { SyncStatus } from '../../types/auth'
import { isGameSession, loadStoredSessions, replaceStoredSessions } from '../storage/gameStore'
import { browserLocalStorage } from '../storage/localStorageAdapter'
import type { StorageAdapter } from '../storage/localStorageAdapter'
import { StorageKey } from '../storage/storageKeys'
import { mergeCompletedSessions } from './mergeSessions'

export interface SessionSyncGateway {
  loadSessions: () => Promise<GameSession[]>
  upsertSessions: (sessions: GameSession[]) => Promise<void>
  deleteSessions: (sessionIds: string[]) => Promise<void>
}

interface GameSessionRow {
  payload: unknown
}

interface ActiveSessionSync {
  gateway: SessionSyncGateway
  onStatusChange: (status: SyncStatus) => void
}

let activeSync: ActiveSessionSync | null = null
let flushPromise: Promise<void> | null = null

const loadQueuedIds = (storage: StorageAdapter): string[] => {
  const value = storage.getItem(StorageKey.SyncQueue)

  if (value === null) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const saveQueuedIds = (ids: string[], storage: StorageAdapter): void => {
  if (ids.length === 0) {
    storage.removeItem(StorageKey.SyncQueue)
    return
  }

  storage.setItem(StorageKey.SyncQueue, JSON.stringify([...new Set(ids)]))
}

const enqueueSessionIds = (ids: string[], storage: StorageAdapter): void => {
  saveQueuedIds([...loadQueuedIds(storage), ...ids], storage)
}

const removeQueuedIds = (ids: string[], storage: StorageAdapter): void => {
  const completedIds = new Set(ids)
  saveQueuedIds(
    loadQueuedIds(storage).filter((id) => !completedIds.has(id)),
    storage,
  )
}

const loadQueuedDeletionIds = (storage: StorageAdapter): string[] => {
  const value = storage.getItem(StorageKey.SyncDeleteQueue)

  if (value === null) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const saveQueuedDeletionIds = (ids: string[], storage: StorageAdapter): void => {
  if (ids.length === 0) {
    storage.removeItem(StorageKey.SyncDeleteQueue)
    return
  }

  storage.setItem(StorageKey.SyncDeleteQueue, JSON.stringify([...new Set(ids)]))
}

export const createSupabaseSessionGateway = (client: SupabaseClient): SessionSyncGateway => ({
  loadSessions: async () => {
    const { data, error } = await client.from('game_sessions').select('payload')

    if (error !== null) {
      throw error
    }

    return ((data ?? []) as GameSessionRow[]).map((row) => row.payload).filter(isGameSession)
  },
  upsertSessions: async (sessions) => {
    if (sessions.length === 0) {
      return
    }

    await Promise.all(
      sessions.map(async (session) => {
        const result = await client.rpc('upsert_game_session', {
          session_id: session.id,
          session_mode: session.mode,
          session_status: session.status,
          session_started_at: session.startedAt,
          session_completed_at: session.completedAt ?? session.startedAt,
          session_client_updated_at: session.completedAt ?? session.startedAt,
          session_payload: session,
        })

        if (result.error !== null) {
          throw result.error
        }

        if (result.data !== session.id) {
          throw new Error(`Database did not confirm session upload: ${session.id}`)
        }
      }),
    )
  },
  deleteSessions: async (sessionIds) => {
    if (sessionIds.length === 0) {
      return
    }

    const { error } = await client.from('game_sessions').delete().in('id', sessionIds)

    if (error !== null) {
      throw error
    }
  },
})

export const synchronizeSessions = async (
  gateway: SessionSyncGateway,
  storage: StorageAdapter = browserLocalStorage,
): Promise<void> => {
  const localSessions = loadStoredSessions(storage)

  try {
    const remoteSessions = await gateway.loadSessions()
    const { sessions, sessionsToUpload } = mergeCompletedSessions(localSessions, remoteSessions)

    replaceStoredSessions(sessions, storage)
    enqueueSessionIds(
      sessionsToUpload.map((session) => session.id),
      storage,
    )
    if (sessionsToUpload.length > 0) {
      await gateway.upsertSessions(sessionsToUpload)
    }
    removeQueuedIds(
      sessionsToUpload.map((session) => session.id),
      storage,
    )
    storage.setItem(StorageKey.LastSyncAt, new Date().toISOString())
  } catch (error) {
    enqueueSessionIds(
      localSessions
        .filter((session) => session.status === GameStatus.Completed)
        .map((session) => session.id),
      storage,
    )
    throw error
  }
}

const flushQueuedSessions = async (
  sync: ActiveSessionSync,
  storage: StorageAdapter = browserLocalStorage,
): Promise<void> => {
  const queuedIds = new Set(loadQueuedIds(storage))
  const sessions = loadStoredSessions(storage).filter(
    (session) => queuedIds.has(session.id) && session.status === GameStatus.Completed,
  )

  if (sessions.length === 0) {
    saveQueuedIds([], storage)
    return
  }

  await sync.gateway.upsertSessions(sessions)
  removeQueuedIds(
    sessions.map((session) => session.id),
    storage,
  )
  storage.setItem(StorageKey.LastSyncAt, new Date().toISOString())
}

const flushQueuedDeletions = async (
  sync: ActiveSessionSync,
  storage: StorageAdapter = browserLocalStorage,
): Promise<void> => {
  const sessionIds = loadQueuedDeletionIds(storage)

  if (sessionIds.length === 0) {
    return
  }

  await sync.gateway.deleteSessions(sessionIds)
  saveQueuedDeletionIds([], storage)
}

const runSync = async (operation: (sync: ActiveSessionSync) => Promise<void>): Promise<void> => {
  if (activeSync === null) {
    return
  }

  if (flushPromise !== null) {
    await flushPromise
    await runSync(operation)
    return
  }

  const sync = activeSync
  sync.onStatusChange(SyncStatus.Syncing)

  const execute = async () => {
    try {
      await operation(sync)
      if (activeSync === sync) {
        sync.onStatusChange(SyncStatus.Synced)
      }
    } catch {
      if (activeSync === sync) {
        sync.onStatusChange(SyncStatus.Error)
      }
    }
  }
  const currentPromise = execute()
  flushPromise = currentPromise
  await currentPromise

  if (flushPromise === currentPromise) {
    flushPromise = null
  }
}

export const flushPendingSessionSync = (): Promise<void> => {
  if (activeSync === null) {
    return Promise.resolve()
  }

  return runSync(async (sync) => {
    await flushQueuedDeletions(sync)
    await flushQueuedSessions(sync)
  })
}

export const clearSyncedLocalSessionData = (
  storage: StorageAdapter = browserLocalStorage,
): void => {
  const pendingUploadIds = new Set(loadQueuedIds(storage))
  const sessions = loadStoredSessions(storage).filter(
    (entry) => entry.status !== GameStatus.Completed || pendingUploadIds.has(entry.id),
  )

  replaceStoredSessions(sessions, storage)

  if (pendingUploadIds.size === 0) {
    storage.removeItem(StorageKey.SyncQueue)
    storage.removeItem(StorageKey.SyncDeleteQueue)
    storage.removeItem(StorageKey.LastSyncAt)
  }
}

export const startSessionSync = (
  client: SupabaseClient,
  onStatusChange: (status: SyncStatus) => void,
): Promise<void> =>
  startSessionSyncWithGateway(createSupabaseSessionGateway(client), onStatusChange)

export const startSessionSyncWithGateway = (
  gateway: SessionSyncGateway,
  onStatusChange: (status: SyncStatus) => void,
): Promise<void> => {
  activeSync = {
    gateway,
    onStatusChange,
  }

  return runSync(async (sync) => {
    await flushQueuedDeletions(sync)
    await synchronizeSessions(sync.gateway)
    await flushQueuedSessions(sync)
  })
}

export const stopSessionSync = (): void => {
  activeSync = null
}

export const retrySessionSync = (): Promise<void> =>
  runSync(async (sync) => {
    await flushQueuedDeletions(sync)
    await flushQueuedSessions(sync)
  })

export const queueCompletedSessionSync = (session: GameSession): void => {
  if (activeSync === null || session.status !== GameStatus.Completed) {
    return
  }

  enqueueSessionIds([session.id], browserLocalStorage)
  void retrySessionSync()
}

export const queueSessionDeletionSync = (sessionId: string): void => {
  if (activeSync === null) {
    return
  }

  removeQueuedIds([sessionId], browserLocalStorage)
  saveQueuedDeletionIds(
    [...loadQueuedDeletionIds(browserLocalStorage), sessionId],
    browserLocalStorage,
  )
  void retrySessionSync()
}
