import type { ActiveGameSnapshot } from '../types/activeGameSnapshot'
import type { GameSession } from '../types/gameSession'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isGameSession = (value: unknown): value is GameSession => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.mode === 'string' &&
    typeof value.status === 'string' &&
    typeof value.startedAt === 'string' &&
    Array.isArray(value.players) &&
    Array.isArray(value.visits)
  )
}

const isActiveGameSnapshot = (value: unknown): value is ActiveGameSnapshot => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isGameSession(value.session) &&
    typeof value.turnIndex === 'number' &&
    Array.isArray(value.pendingDarts) &&
    typeof value.savedAt === 'string'
  )
}

export const serializeGameSession = (session: GameSession): string => JSON.stringify(session)

export const parseGameSession = (serialized: string): GameSession => {
  const parsed: unknown = JSON.parse(serialized)

  if (!isGameSession(parsed)) {
    throw new Error('Invalid game session JSON')
  }

  return parsed
}

export const serializeEngineState = (state: unknown): string => JSON.stringify(state)

export const parseEngineState = (serialized: string): unknown => JSON.parse(serialized)

export const serializeActiveGameSnapshot = (snapshot: ActiveGameSnapshot): string =>
  JSON.stringify(snapshot)

export const parseActiveGameSnapshot = (serialized: string): ActiveGameSnapshot => {
  const parsed: unknown = JSON.parse(serialized)

  if (!isActiveGameSnapshot(parsed)) {
    throw new Error('Invalid active game snapshot JSON')
  }

  return parsed
}
