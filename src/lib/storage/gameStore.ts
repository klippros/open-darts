import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import type { GameSession } from '../../types/gameSession'
import type { StorageAdapter } from './localStorageAdapter'
import { browserLocalStorage } from './localStorageAdapter'
import { StorageKey } from './storageKeys'

const parseJson = (value: string | null): unknown => {
  if (value === null) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const isGameSession = (value: unknown): value is GameSession => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const session = value as Partial<GameSession>

  return (
    typeof session.id === 'string' &&
    typeof session.mode === 'string' &&
    typeof session.status === 'string' &&
    typeof session.startedAt === 'string' &&
    Array.isArray(session.players) &&
    Array.isArray(session.visits)
  )
}

const isActiveGameSnapshot = (value: unknown): value is ActiveGameSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const snapshot = value as Partial<ActiveGameSnapshot>

  return (
    typeof snapshot.turnIndex === 'number' &&
    Array.isArray(snapshot.pendingDarts) &&
    typeof snapshot.savedAt === 'string' &&
    isGameSession(snapshot.session)
  )
}

export const loadStoredSessions = (
  storage: StorageAdapter = browserLocalStorage,
): GameSession[] => {
  const parsed = parseJson(storage.getItem(StorageKey.Sessions))

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter(isGameSession)
}

export const saveStoredSession = (
  session: GameSession,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  const sessions = loadStoredSessions(storage)
  const nextSessions = [...sessions.filter((entry) => entry.id !== session.id), session]

  storage.setItem(StorageKey.Sessions, JSON.stringify(nextSessions))
}

export const removeStoredSession = (
  sessionId: string,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  const sessions = loadStoredSessions(storage).filter((entry) => entry.id !== sessionId)

  storage.setItem(StorageKey.Sessions, JSON.stringify(sessions))
}

export const clearStoredSessions = (storage: StorageAdapter = browserLocalStorage): void => {
  storage.removeItem(StorageKey.Sessions)
}

export const loadActiveSnapshot = (
  storage: StorageAdapter = browserLocalStorage,
): ActiveGameSnapshot | null => {
  const parsed = parseJson(storage.getItem(StorageKey.ActiveSession))

  if (parsed === null || !isActiveGameSnapshot(parsed)) {
    return null
  }

  return parsed
}

export const saveActiveSnapshot = (
  snapshot: ActiveGameSnapshot,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  storage.setItem(StorageKey.ActiveSession, JSON.stringify(snapshot))
}

export const clearActiveSnapshot = (storage: StorageAdapter = browserLocalStorage): void => {
  storage.removeItem(StorageKey.ActiveSession)
}
