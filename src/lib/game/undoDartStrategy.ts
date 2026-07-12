import { GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { Player } from '../../types/player'
import { PlayerKind } from '../../types/player'
import type { DartThrow } from '../../types/dart'
import type { Visit } from '../../types/visit'
import { decrementLegWin, revertLegWin } from './matchLegs'

export const hasBotOpponent = (players: Player[]): boolean =>
  players.some((player) => player.kind === PlayerKind.Bot)

export const getPrimaryHumanPlayerId = (players: Player[]): string | undefined => players[0]?.id

export interface UndoDartState {
  visits: Visit[]
  pendingDarts: DartThrow[]
  turnIndex: number
  matchProgress: GameSession['matchProgress']
  status: GameStatus
  completedAt: string | undefined
  finishedEarly: undefined
}

const findLastVisitIndexForPlayer = (visits: Visit[], playerId: string): number => {
  for (let index = visits.length - 1; index >= 0; index -= 1) {
    if (visits[index]?.playerId === playerId) {
      return index
    }
  }

  return -1
}

const applyCheckoutUndoProgress = (
  matchProgress: GameSession['matchProgress'],
  removedVisit: Visit,
): GameSession['matchProgress'] => {
  if (matchProgress === undefined || !removedVisit.checkout) {
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
    matchProgress: applyCheckoutUndoProgress(session.matchProgress, lastVisit),
    status: GameStatus.InProgress,
    completedAt: undefined,
    finishedEarly: undefined,
  }
}

export const undoLastDartForPlayer = (
  session: GameSession,
  turnIndex: number,
  pendingDarts: DartThrow[],
  targetPlayerId: string,
): UndoDartState | null => {
  const targetTurnIndex = session.players.findIndex((player) => player.id === targetPlayerId)

  if (targetTurnIndex === -1) {
    return null
  }

  if (session.players[turnIndex]?.id === targetPlayerId && pendingDarts.length > 0) {
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

  const lastHumanVisitIndex = findLastVisitIndexForPlayer(session.visits, targetPlayerId)

  if (lastHumanVisitIndex === -1) {
    return null
  }

  const lastHumanVisit = session.visits[lastHumanVisitIndex]

  if (lastHumanVisit === undefined || lastHumanVisit.darts.length === 0) {
    return null
  }

  const visits = session.visits.slice(0, lastHumanVisitIndex)
  const nextPendingDarts =
    lastHumanVisit.darts.length <= 1
      ? []
      : lastHumanVisit.darts.slice(0, lastHumanVisit.darts.length - 1)

  return {
    visits,
    pendingDarts: nextPendingDarts,
    turnIndex: targetTurnIndex,
    matchProgress: applyCheckoutUndoProgress(session.matchProgress, lastHumanVisit),
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
  const primaryHumanId = getPrimaryHumanPlayerId(session.players)

  if (hasBotOpponent(session.players) && primaryHumanId !== undefined) {
    return undoLastDartForPlayer(session, turnIndex, pendingDarts, primaryHumanId)
  }

  return undoLastDartChronological(session, turnIndex, pendingDarts)
}
