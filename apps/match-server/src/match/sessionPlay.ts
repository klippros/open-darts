import {
  createGameController,
  getInitialTurnIndex,
  restoreGameController,
} from '@open-darts/game/game/createSession'
import type { AppGameController } from '@open-darts/game/game/createSession'
import { correctVisit, CorrectVisitError } from '@open-darts/game/game/correctVisit'
import type { VisitCorrection } from '@open-darts/game/game/correctVisit'
import { parseGameSession, serializeGameSession } from '@open-darts/game/game/serializeGame'
import { GameStatus } from '@open-darts/game/types/gameMode'
import type { GameConfig, GameModeId } from '@open-darts/game/types/gameMode'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { PlayerKind } from '@open-darts/game/types/player'
import { isRecord } from '../json'
import type { MatchPlayerSnapshot } from './types'

export interface StoredPlayState {
  session: GameSession
  turnIndex: number
  pendingFinalization: boolean
}

export const createOnlineSession = (input: {
  matchId: string
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: 0 | 1
  players: MatchPlayerSnapshot[]
}): StoredPlayState => {
  const ordered = [...input.players].sort((left, right) => left.slot - right.slot)
  const players = ordered.map((player) => ({
    id: player.userId,
    name: player.slot === 0 ? 'Player 1' : 'Player 2',
    kind: PlayerKind.Remote,
  }))

  const controller = createGameController({
    mode: input.mode,
    config: input.config,
    players,
    sessionId: input.matchId,
    matchFormat: {
      legsToWin: input.legsToWin,
      startingPlayerIndex: input.startingPlayerSlot,
    },
  })

  return {
    session: controller.session,
    turnIndex: controller.turnIndex,
    pendingFinalization: false,
  }
}

export const loadController = (play: StoredPlayState): AppGameController =>
  restoreGameController({
    session: play.session,
    turnIndex: play.turnIndex,
    pendingDarts: [],
    savedAt: new Date().toISOString(),
  })

export const serializePlayState = (play: StoredPlayState): string =>
  JSON.stringify({
    session: play.session,
    turnIndex: play.turnIndex,
    pendingFinalization: play.pendingFinalization,
  })

export const parsePlayState = (serialized: string): StoredPlayState => {
  const envelope: unknown = JSON.parse(serialized)

  if (isRecord(envelope) && 'session' in envelope && typeof envelope.turnIndex === 'number') {
    const session = parseGameSession(JSON.stringify(envelope.session))
    const pendingFinalization = envelope.pendingFinalization === true

    return {
      session,
      turnIndex: envelope.turnIndex,
      pendingFinalization,
    }
  }

  const session = parseGameSession(serialized)

  return {
    session,
    turnIndex: getInitialTurnIndex(session),
    pendingFinalization: session.status === GameStatus.Completed,
  }
}

const afterCommit = (
  previous: AppGameController,
  next: AppGameController,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  if (next.session.visits.length === previous.session.visits.length) {
    return { ok: false, reason: 'Visit was not accepted' }
  }

  const pendingFinalization = next.session.status === GameStatus.Completed

  return {
    ok: true,
    play: {
      session: pendingFinalization
        ? { ...next.session, status: GameStatus.InProgress, completedAt: undefined }
        : next.session,
      turnIndex: next.turnIndex,
      pendingFinalization,
    },
  }
}

export const applyRecordDarts = (
  play: StoredPlayState,
  actorUserId: string,
  darts: DartThrow[],
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  if (play.pendingFinalization) {
    return { ok: false, reason: 'Match is waiting to be finalized' }
  }

  const controller = loadController(play)

  if (controller.session.status === GameStatus.Completed) {
    return { ok: false, reason: 'Match session is already complete' }
  }

  if (controller.activePlayerId !== actorUserId) {
    return { ok: false, reason: 'Not your turn' }
  }

  return afterCommit(controller, controller.recordDarts(darts))
}

export const applyRecordVisitScore = (
  play: StoredPlayState,
  actorUserId: string,
  score: number,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  if (play.pendingFinalization) {
    return { ok: false, reason: 'Match is waiting to be finalized' }
  }

  const controller = loadController(play)

  if (controller.session.status === GameStatus.Completed) {
    return { ok: false, reason: 'Match session is already complete' }
  }

  if (controller.activePlayerId !== actorUserId) {
    return { ok: false, reason: 'Not your turn' }
  }

  return afterCommit(controller, controller.recordVisitScore(score))
}

const getCountingVisitCount = (session: GameSession): number =>
  session.visits.filter((visit) => visit.voided !== true).length

export const applyUndoVisit = (
  play: StoredPlayState,
  actorUserId: string,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  const controller = loadController(
    play.pendingFinalization
      ? {
          ...play,
          session: {
            ...play.session,
            status: GameStatus.Completed,
            completedAt: play.session.completedAt ?? new Date().toISOString(),
          },
        }
      : play,
  )

  const lastVisit = [...controller.session.visits].reverse().find((visit) => visit.voided !== true)

  if (lastVisit === undefined) {
    return { ok: false, reason: 'No visit to undo' }
  }

  if (lastVisit.playerId !== actorUserId) {
    return { ok: false, reason: 'Can only undo your own visit' }
  }

  if (!play.pendingFinalization) {
    const opponentHasThrown = controller.session.visits.some(
      (visit) =>
        visit.voided !== true &&
        visit.visitIndex > lastVisit.visitIndex &&
        visit.playerId !== actorUserId,
    )

    if (opponentHasThrown) {
      return { ok: false, reason: 'Opponent has already thrown' }
    }
  }

  let next = controller
  const visitCountBefore = getCountingVisitCount(next.session)

  while (getCountingVisitCount(next.session) === visitCountBefore) {
    const undone = next.undoDart()

    if (undone === next) {
      return { ok: false, reason: 'Unable to undo visit' }
    }

    next = undone
  }

  while (next.pendingDarts.length > 0) {
    const cleared = next.undoDart()

    if (cleared === next) {
      break
    }

    next = cleared
  }

  return {
    ok: true,
    play: {
      session: {
        ...next.session,
        status: GameStatus.InProgress,
        completedAt: undefined,
        finishedEarly: undefined,
      },
      turnIndex: next.turnIndex,
      pendingFinalization: false,
    },
  }
}

export const applyCorrectVisit = (
  play: StoredPlayState,
  actorUserId: string,
  visitIndex: number,
  correction: VisitCorrection,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  if (play.pendingFinalization) {
    return { ok: false, reason: 'Match is waiting to be finalized' }
  }

  const result = correctVisit(play.session, actorUserId, visitIndex, correction)

  if (!result.ok) {
    if (result.error === CorrectVisitError.NotVisitOwner) {
      return { ok: false, reason: 'Can only correct your own visit' }
    }

    return { ok: false, reason: 'Visit not found' }
  }

  const pendingFinalization = result.session.status === GameStatus.Completed

  return {
    ok: true,
    play: {
      session: pendingFinalization
        ? { ...result.session, status: GameStatus.InProgress, completedAt: undefined }
        : result.session,
      turnIndex: result.turnIndex,
      pendingFinalization,
    },
  }
}

export const resolveMatchWinnerUserId = (session: GameSession): string | null => {
  const { matchProgress } = session

  if (matchProgress !== undefined) {
    for (const [playerId, wins] of Object.entries(matchProgress.legWins)) {
      if (wins >= matchProgress.legsToWin) {
        return playerId
      }
    }
  }

  const checkout = [...session.visits]
    .reverse()
    .find((visit) => visit.voided !== true && visit.checkout)

  return checkout?.playerId ?? null
}

export const finalizeSession = (play: StoredPlayState): StoredPlayState => ({
  session: {
    ...play.session,
    status: GameStatus.Completed,
    completedAt: play.session.completedAt ?? new Date().toISOString(),
  },
  turnIndex: play.turnIndex,
  pendingFinalization: false,
})

export const playStateToSessionJson = (play: StoredPlayState): string => serializePlayState(play)

export const sessionJsonOnly = (session: GameSession): string => serializeGameSession(session)
