import type { DartThrow } from '../types/dart'
import type { GameSession } from '../types/gameSession'
import { VisitInputMode } from '../types/visit'
import type { Visit } from '../types/visit'
import { replaySession } from './replaySession'
import type { ReplaySessionResult } from './replaySession'

export enum CorrectVisitError {
  VisitNotFound = 'visit-not-found',
  NotVisitOwner = 'not-visit-owner',
}

export type VisitCorrection = { darts: DartThrow[] } | { visitScore: number }

export type CorrectVisitResult =
  ({ ok: true } & ReplaySessionResult) | { ok: false; error: CorrectVisitError }

const applyCorrection = (visit: Visit, correction: VisitCorrection): Visit => {
  if ('darts' in correction) {
    return {
      ...visit,
      darts: correction.darts,
      inputMode: VisitInputMode.PerDart,
      voided: undefined,
    }
  }

  return {
    ...visit,
    darts: [],
    visitScore: correction.visitScore,
    bust: false,
    checkout: false,
    inputMode: VisitInputMode.VisitScore,
    voided: undefined,
  }
}

export const correctVisit = (
  session: GameSession,
  actorPlayerId: string,
  visitIndex: number,
  correction: VisitCorrection,
  now?: string,
): CorrectVisitResult => {
  const target = session.visits.find((visit) => visit.visitIndex === visitIndex)

  if (target === undefined) {
    return { ok: false, error: CorrectVisitError.VisitNotFound }
  }

  if (target.playerId !== actorPlayerId) {
    return { ok: false, error: CorrectVisitError.NotVisitOwner }
  }

  const visits = session.visits.map((visit) =>
    visit.visitIndex === visitIndex ? applyCorrection(visit, correction) : visit,
  )

  return { ok: true, ...replaySession({ ...session, visits }, now) }
}
