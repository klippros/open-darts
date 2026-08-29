import { GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'

export interface SessionMergeResult {
  sessions: GameSession[]
  sessionsToUpload: GameSession[]
}

const getSessionTimestamp = (session: GameSession): number => {
  const value = session.completedAt ?? session.startedAt
  const timestamp = Date.parse(value)

  return Number.isNaN(timestamp) ? 0 : timestamp
}

const compareSessions = (left: GameSession, right: GameSession): number => {
  const timestampDifference = getSessionTimestamp(left) - getSessionTimestamp(right)

  if (timestampDifference !== 0) {
    return timestampDifference
  }

  const statusDifference =
    Number(left.status === GameStatus.Completed) - Number(right.status === GameStatus.Completed)

  if (statusDifference !== 0) {
    return statusDifference
  }

  return left.visits.length - right.visits.length
}

export const mergeCompletedSessions = (
  localSessions: GameSession[],
  remoteSessions: GameSession[],
): SessionMergeResult => {
  const remoteById = new Map(
    remoteSessions
      .filter((session) => session.status === GameStatus.Completed)
      .map((session) => [session.id, session]),
  )
  const mergedById = new Map(remoteById)
  const sessionsToUpload: GameSession[] = []

  for (const localSession of localSessions) {
    if (localSession.status !== GameStatus.Completed) {
      continue
    }

    const remoteSession = remoteById.get(localSession.id)

    if (remoteSession === undefined || compareSessions(localSession, remoteSession) > 0) {
      mergedById.set(localSession.id, localSession)
      sessionsToUpload.push(localSession)
    }
  }

  return {
    sessions: [...mergedById.values()],
    sessionsToUpload,
  }
}
