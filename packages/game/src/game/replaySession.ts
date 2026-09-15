import { GameStatus } from '../types/gameMode'
import type { GameSession } from '../types/gameSession'
import type { MatchProgress } from '../types/match'
import type { Player } from '../types/player'
import { VisitInputMode } from '../types/visit'
import type { Visit } from '../types/visit'
import { getInitialTurnIndex } from './createSession'
import { GameController } from './GameController'
import { getEngine } from './gameRegistry'

export interface ReplaySessionResult {
  session: GameSession
  engineState: unknown
  turnIndex: number
}

const resetMatchProgress = (
  matchProgress: MatchProgress | undefined,
  players: Player[],
): MatchProgress | undefined => {
  if (matchProgress === undefined) {
    return undefined
  }

  return {
    ...matchProgress,
    currentLeg: 1,
    legWins: Object.fromEntries(players.map((player) => [player.id, 0])),
    ...(matchProgress.challenge === undefined ? {} : { legLosses: 0 }),
  }
}

const applyRecordedVisit = (
  controller: GameController<unknown, GameSession['config']>,
  visit: Visit,
): GameController<unknown, GameSession['config']> => {
  if (visit.inputMode === VisitInputMode.VisitScore) {
    const scoreToReplay = visit.bust ? visit.scoreBefore + 1 : visit.visitScore
    return controller.recordVisitScore(scoreToReplay)
  }

  return controller.recordDarts(visit.darts)
}

export const replaySession = (session: GameSession, now?: string): ReplaySessionResult => {
  const engine = getEngine(session.mode)
  const emptySession: GameSession = {
    ...session,
    visits: [],
    status: GameStatus.InProgress,
    completedAt: undefined,
    finishedEarly: undefined,
    matchProgress: resetMatchProgress(session.matchProgress, session.players),
  }
  let controller = new GameController(
    emptySession,
    engine,
    engine.createInitialState(session.players, session.config),
    [],
    getInitialTurnIndex(emptySession),
  )
  const replayedVisits: Visit[] = []

  for (const visit of session.visits) {
    const currentLeg = controller.session.matchProgress?.currentLeg
    const visitLeg = visit.legIndex ?? 1
    const leftoverFromCompletedLeg = currentLeg !== undefined && visitLeg < currentLeg

    if (controller.isComplete || leftoverFromCompletedLeg) {
      replayedVisits.push({ ...visit, voided: true })
      continue
    }

    const next = applyRecordedVisit(controller, visit)
    const committed = next.session.visits.at(-1)

    if (
      committed === undefined ||
      next.session.visits.length === controller.session.visits.length
    ) {
      replayedVisits.push({ ...visit, voided: true })
      continue
    }

    replayedVisits.push({
      ...committed,
      visitIndex: visit.visitIndex,
      metadata: visit.metadata,
    })
    controller = next
  }

  const completedAt = controller.isComplete
    ? (now ?? session.completedAt ?? controller.session.completedAt)
    : undefined

  return {
    session: {
      ...controller.session,
      id: session.id,
      startedAt: session.startedAt,
      visits: replayedVisits,
      completedAt,
    },
    engineState: controller.engineState,
    turnIndex: controller.turnIndex,
  }
}
