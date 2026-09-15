import type { Visit } from '@open-darts/game/types/visit'
import { VisitInputMode, isCountingVisit } from '@open-darts/game/types/visit'
import { GameStatus } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { DartThrow } from '@open-darts/game/types/dart'
import { restoreGameController } from '@open-darts/game/game/createSession'
import type { AppGameController } from '@open-darts/game/game/createSession'
import type { ScoreboardSnapshot } from '@open-darts/game/game/GameEngine'
import { MatchCommandName } from './types'
import type { MatchCommand, PublicDartThrow } from './types'
import { VoiceIntentKind } from '../voice/parseVoiceCommand'
import type { VoiceIntent } from '../voice/parseVoiceCommand'

export const getLastOwnCountingVisit = (visits: Visit[], playerId: string): Visit | undefined =>
  [...visits].reverse().find((visit) => isCountingVisit(visit) && visit.playerId === playerId)

export const hasLaterOpponentVisit = (
  visits: Visit[],
  ownVisitIndex: number,
  playerId: string,
): boolean =>
  visits.some(
    (visit) =>
      isCountingVisit(visit) && visit.visitIndex > ownVisitIndex && visit.playerId !== playerId,
  )

export const canAmendLastOwnVisit = (input: {
  isActiveMatch: boolean
  pendingFinalization: boolean
  pendingDartCount: number
  lastOwnVisit: Visit | undefined
  /** True after a full server undo this turn — do not chain into older visits. */
  hasFullyUndoneVisitThisTurn: boolean
}): boolean =>
  input.isActiveMatch &&
  !input.pendingFinalization &&
  input.pendingDartCount === 0 &&
  input.lastOwnVisit !== undefined &&
  !input.hasFullyUndoneVisitThisTurn

export const canPressOnlineUndo = (input: {
  pendingDartCount: number
  isCorrecting: boolean
  /** Visit-score correction starts empty; undo cancels. Per-dart empty draft cannot undo further. */
  correctionStartedEmpty: boolean
  canAmendLastVisit: boolean
  pendingFinalization: boolean
  hasLastOwnVisit: boolean
}): boolean => {
  if (input.pendingDartCount > 0) {
    return true
  }

  if (input.isCorrecting) {
    return input.correctionStartedEmpty
  }

  if (input.pendingFinalization) {
    return input.hasLastOwnVisit
  }

  return input.canAmendLastVisit
}

export enum AmendOwnVisitKind {
  UndoVisit = 'undo_visit',
  EnterCorrection = 'enter_correction',
}

export const resolveAmendOwnVisitKind = (
  visits: Visit[],
  lastOwnVisit: Visit,
  playerId: string,
): AmendOwnVisitKind =>
  hasLaterOpponentVisit(visits, lastOwnVisit.visitIndex, playerId)
    ? AmendOwnVisitKind.EnterCorrection
    : AmendOwnVisitKind.UndoVisit

export enum AmendOwnVisitVoiceActionKind {
  UndoVisit = 'undo_visit',
  EnterCorrection = 'enter_correction',
  CorrectVisitScore = 'correct_visit_score',
}

export type AmendOwnVisitVoiceAction =
  | { kind: AmendOwnVisitVoiceActionKind.UndoVisit }
  | { kind: AmendOwnVisitVoiceActionKind.EnterCorrection }
  | {
      kind: AmendOwnVisitVoiceActionKind.CorrectVisitScore
      visitIndex: number
      visitScore: number
    }

export const resolveAmendOwnVisitVoiceAction = (input: {
  intent: VoiceIntent
  visits: Visit[]
  playerId: string
  lastOwnVisit: Visit
}): AmendOwnVisitVoiceAction | null => {
  const { intent, visits, playerId, lastOwnVisit } = input
  const laterOpponent = hasLaterOpponentVisit(visits, lastOwnVisit.visitIndex, playerId)

  if (intent.kind === VoiceIntentKind.Undo) {
    return laterOpponent
      ? { kind: AmendOwnVisitVoiceActionKind.EnterCorrection }
      : { kind: AmendOwnVisitVoiceActionKind.UndoVisit }
  }

  if (intent.kind === VoiceIntentKind.Fix) {
    if (laterOpponent && intent.inner.kind === VoiceIntentKind.VisitScore) {
      return {
        kind: AmendOwnVisitVoiceActionKind.CorrectVisitScore,
        visitIndex: lastOwnVisit.visitIndex,
        visitScore: intent.inner.score,
      }
    }

    return laterOpponent
      ? { kind: AmendOwnVisitVoiceActionKind.EnterCorrection }
      : { kind: AmendOwnVisitVoiceActionKind.UndoVisit }
  }

  return null
}

export const buildCorrectVisitScoreCommand = (
  visitIndex: number,
  visitScore: number,
): MatchCommand => ({
  name: MatchCommandName.CorrectVisit,
  visitIndex,
  visitScore,
})

export const buildCorrectVisitDartsCommand = (
  visitIndex: number,
  darts: PublicDartThrow[],
): MatchCommand => ({
  name: MatchCommandName.CorrectVisit,
  visitIndex,
  darts,
})

/** Match local undoDart: peel one dart from a committed per-dart visit; visit-score undoes wholly. */
export const remainingDartsAfterPeelingLast = (visit: Visit): DartThrow[] => {
  if (visit.inputMode === VisitInputMode.VisitScore || visit.darts.length === 0) {
    return []
  }

  return visit.darts.slice(0, -1)
}

/** Hide the visit being rewritten so history matches local undo; keep later opponent visits. */
export const visitsWithCorrectionRemoved = (
  visits: Visit[],
  correctingVisitIndex: number,
): Visit[] => visits.filter((visit) => visit.visitIndex !== correctingVisitIndex)

/**
 * Our scores come from the local peel draft; opponents keep authoritative scores
 * (including visits thrown after the one we are rewriting).
 */
export const mergeCorrectionScoreboard = (
  draft: ScoreboardSnapshot,
  authoritative: ScoreboardSnapshot,
  correctingPlayerId: string,
): ScoreboardSnapshot => ({
  mode: authoritative.mode,
  players: authoritative.players.map((player) => {
    if (player.playerId !== correctingPlayerId) {
      return { ...player, isActive: false }
    }

    const draftPlayer = draft.players.find((entry) => entry.playerId === correctingPlayerId)

    return draftPlayer !== undefined
      ? { ...draftPlayer, isActive: true }
      : { ...player, isActive: true }
  }),
})

export const shouldClearOnlineLocalDraft = (input: {
  correctingVisitIndex: number | null
  visits: Visit[]
  matchActive: boolean
  pendingFinalization: boolean
}): boolean => {
  // Keep uncommitted local darts / entry mode across opponent undos and corrections.
  // Turn changes alone must not wipe a draft that was never sent to the server.
  if (!input.matchActive || input.pendingFinalization) {
    return true
  }

  if (input.correctingVisitIndex === null) {
    return false
  }

  const target = input.visits.find((visit) => visit.visitIndex === input.correctingVisitIndex)

  return target === undefined || !isCountingVisit(target)
}

/** Local entry controller for rewriting a past visit while the match turn stays with the opponent. */
export const createCorrectionEntryController = (
  session: GameSession,
  correctingVisitIndex: number,
  playerId: string,
  pendingDarts: DartThrow[],
): AppGameController | null => {
  const target = session.visits.find((visit) => visit.visitIndex === correctingVisitIndex)

  if (target === undefined || target.playerId !== playerId) {
    return null
  }

  const playerIndex = session.players.findIndex((player) => player.id === playerId)

  if (playerIndex < 0) {
    return null
  }

  const truncated: GameSession = {
    ...session,
    visits: session.visits.filter((visit) => visit.visitIndex < correctingVisitIndex),
    status: GameStatus.InProgress,
    completedAt: undefined,
    finishedEarly: undefined,
  }

  return restoreGameController({
    session: truncated,
    turnIndex: playerIndex,
    pendingDarts,
    savedAt: new Date().toISOString(),
  })
}
