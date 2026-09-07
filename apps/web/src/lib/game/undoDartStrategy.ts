import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { DartThrow } from '../../types/dart'
import type { Visit } from '../../types/visit'
import { countPlayerVisitsInLeg, isChallengeMode, isLegWithinVisitLimit } from './challenge'
import { decrementLegLoss, decrementLegWin, revertLegLoss, revertLegWin } from './matchLegs'

export const getPrimaryHumanPlayerId = (players: GameSession['players']): string | undefined =>
  players[0]?.id

export interface UndoDartState {
  visits: Visit[]
  pendingDarts: DartThrow[]
  turnIndex: number
  matchProgress: GameSession['matchProgress']
  status: GameStatus
  completedAt: string | undefined
  finishedEarly: undefined
}

const applyChallengeLegResultUndo = (
  matchProgress: GameSession['matchProgress'],
  removedVisit: Visit,
  visitsBeforeRemoval: Visit[],
): GameSession['matchProgress'] => {
  if (matchProgress === undefined || !isChallengeMode(matchProgress)) {
    return matchProgress
  }

  const challenge = matchProgress.challenge

  if (challenge === undefined) {
    return matchProgress
  }

  const removedLegIndex = removedVisit.legIndex ?? 1
  const visitsUsed = countPlayerVisitsInLeg(
    visitsBeforeRemoval,
    removedLegIndex,
    removedVisit.playerId,
  )
  const legWasWin = removedVisit.checkout && isLegWithinVisitLimit(visitsUsed, challenge.maxVisits)
  const legWasLoss = !legWasWin && (removedVisit.checkout || removedVisit.scoreAfter > 0)

  if (!legWasWin && !legWasLoss) {
    return matchProgress
  }

  if (removedLegIndex < matchProgress.currentLeg) {
    return legWasWin
      ? revertLegWin(matchProgress, removedVisit.playerId)
      : revertLegLoss(matchProgress)
  }

  if (legWasWin) {
    return decrementLegWin(matchProgress, removedVisit.playerId)
  }

  return decrementLegLoss(matchProgress)
}

const applyCheckoutUndoProgress = (
  matchProgress: GameSession['matchProgress'],
  removedVisit: Visit,
  visitsBeforeRemoval: Visit[],
): GameSession['matchProgress'] => {
  if (matchProgress === undefined) {
    return matchProgress
  }

  if (isChallengeMode(matchProgress)) {
    return applyChallengeLegResultUndo(matchProgress, removedVisit, visitsBeforeRemoval)
  }

  if (!removedVisit.checkout) {
    return matchProgress
  }

  const removedLegIndex = removedVisit.legIndex ?? 1
  const winnerId = removedVisit.playerId

  if (removedLegIndex < matchProgress.currentLeg) {
    return revertLegWin(matchProgress, winnerId)
  }

  if ((matchProgress.legWins[winnerId] ?? 0) > 0) {
    return decrementLegWin(matchProgress, winnerId)
  }

  return matchProgress
}

export const undoLastDartChronological = (
  session: GameSession,
  turnIndex: number,
  pendingDarts: DartThrow[],
): UndoDartState | null => {
  if (pendingDarts.length > 0) {
    return {
      visits: session.visits,
      pendingDarts: pendingDarts.slice(0, -1),
      turnIndex,
      matchProgress: session.matchProgress,
      status: GameStatus.InProgress,
      completedAt: undefined,
      finishedEarly: undefined,
    }
  }

  const lastVisit = session.visits.at(-1)

  if (lastVisit === undefined) {
    return null
  }

  const visits = session.visits.slice(0, -1)

  return {
    visits,
    pendingDarts: lastVisit.darts.slice(0, -1),
    turnIndex: session.players.findIndex((player) => player.id === lastVisit.playerId),
    matchProgress: applyCheckoutUndoProgress(session.matchProgress, lastVisit, session.visits),
    status: GameStatus.InProgress,
    completedAt: undefined,
    finishedEarly: undefined,
  }
}

export const undoLastVisitChronological = (
  session: GameSession,
  turnIndex: number,
  pendingDarts: DartThrow[],
): UndoDartState | null => {
  if (pendingDarts.length > 0) {
    return {
      visits: session.visits,
      pendingDarts: [],
      turnIndex,
      matchProgress: session.matchProgress,
      status: GameStatus.InProgress,
      completedAt: undefined,
      finishedEarly: undefined,
    }
  }

  const lastVisit = session.visits.at(-1)

  if (lastVisit === undefined) {
    return null
  }

  const visits = session.visits.slice(0, -1)

  return {
    visits,
    pendingDarts: [],
    turnIndex: session.players.findIndex((player) => player.id === lastVisit.playerId),
    matchProgress: applyCheckoutUndoProgress(session.matchProgress, lastVisit, session.visits),
    status: GameStatus.InProgress,
    completedAt: undefined,
    finishedEarly: undefined,
  }
}

export const resolveUndoDartState = (
  session: GameSession,
  turnIndex: number,
  pendingDarts: DartThrow[],
): UndoDartState | null => {
  if (session.mode === GameModeId.Bob27) {
    return undoLastVisitChronological(session, turnIndex, pendingDarts)
  }

  return undoLastDartChronological(session, turnIndex, pendingDarts)
}
