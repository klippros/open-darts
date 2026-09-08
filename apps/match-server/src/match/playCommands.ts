import {
  applyAsyncRecordDarts,
  applyAsyncRecordVisitScore,
  applyAsyncUndoVisit,
  bothAsyncPlayersFinalized,
  finalizeAsyncPlayer,
} from './asyncPlay'
import { commandFailure } from './commands'
import { FINALIZE_TIMEOUT_MS } from './constants'
import { parsePublicDartThrows } from './dartPayload'
import {
  completeAsyncMatch,
  completeFromPendingFinalization,
  persistAsyncPlayMutation,
  persistPlayMutation,
  requireActivePlay,
} from './matchPersist'
import { deleteDeadline } from './alarms'
import { findPlayer, loadPublicMatchState, writePlayState } from './schema'
import {
  applyCorrectVisit,
  applyRecordDarts,
  applyRecordVisitScore,
  applyUndoVisit,
  playStateToSessionJson,
  resolveMatchWinnerUserId,
} from './sessionPlay'
import { CommandErrorCode, DeadlineKind, MatchEndingKind, PlayMode } from './types'
import type { CommandResult, MatchCommand, MatchCommandName } from './types'

export type PreparedMutation = { ok: true } | CommandResult

export const recordDarts = (
  sql: SqlStorage,
  userId: string,
  darts: NonNullable<ReturnType<typeof parsePublicDartThrows>>,
): PreparedMutation => {
  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const state = loadPublicMatchState(sql)

  if (state?.playMode === PlayMode.Asynchronous) {
    const applied = applyAsyncRecordDarts(required.play, userId, darts, FINALIZE_TIMEOUT_MS)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    persistAsyncPlayMutation(sql, userId, applied.play)
    return { ok: true }
  }

  const applied = applyRecordDarts(required.play, userId, darts)

  if (!applied.ok) {
    return commandFailure(CommandErrorCode.Forbidden, applied.reason)
  }

  persistPlayMutation(sql, userId, applied.play)
  return { ok: true }
}

export const recordVisitScore = (
  sql: SqlStorage,
  userId: string,
  score: number,
): PreparedMutation => {
  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const state = loadPublicMatchState(sql)

  if (state?.playMode === PlayMode.Asynchronous) {
    const applied = applyAsyncRecordVisitScore(required.play, userId, score, FINALIZE_TIMEOUT_MS)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    persistAsyncPlayMutation(sql, userId, applied.play)
    return { ok: true }
  }

  const applied = applyRecordVisitScore(required.play, userId, score)

  if (!applied.ok) {
    return commandFailure(CommandErrorCode.Forbidden, applied.reason)
  }

  persistPlayMutation(sql, userId, applied.play)
  return { ok: true }
}

export const undoVisit = (sql: SqlStorage, userId: string): PreparedMutation => {
  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const state = loadPublicMatchState(sql)

  if (state?.playMode === PlayMode.Asynchronous) {
    const applied = applyAsyncUndoVisit(required.play, userId)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    persistAsyncPlayMutation(sql, userId, applied.play)
    return { ok: true }
  }

  const applied = applyUndoVisit(required.play, userId)

  if (!applied.ok) {
    return commandFailure(CommandErrorCode.Forbidden, applied.reason)
  }

  writePlayState(sql, playStateToSessionJson(applied.play), applied.play.turnIndex, false)
  deleteDeadline(sql, DeadlineKind.FinalizeAt)

  return { ok: true }
}

export const correctVisit = (
  sql: SqlStorage,
  userId: string,
  command: Extract<MatchCommand, { name: MatchCommandName.CorrectVisit }>,
): PreparedMutation => {
  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const state = loadPublicMatchState(sql)

  if (state?.playMode === PlayMode.Asynchronous) {
    return commandFailure(
      CommandErrorCode.Invalid,
      'Visit correction is not available in async play',
    )
  }

  if (command.darts !== undefined) {
    const darts = parsePublicDartThrows(command.darts)

    if (darts === null) {
      return commandFailure(CommandErrorCode.Invalid, 'Invalid correction darts')
    }

    const applied = applyCorrectVisit(required.play, userId, command.visitIndex, { darts })

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    persistPlayMutation(sql, userId, applied.play)
    return { ok: true }
  }

  if (command.visitScore === undefined) {
    return commandFailure(CommandErrorCode.Invalid, 'Correction requires darts or visitScore')
  }

  const applied = applyCorrectVisit(required.play, userId, command.visitIndex, {
    visitScore: command.visitScore,
  })

  if (!applied.ok) {
    return commandFailure(CommandErrorCode.Forbidden, applied.reason)
  }

  persistPlayMutation(sql, userId, applied.play)
  return { ok: true }
}

export const finishMatch = (sql: SqlStorage, userId: string): PreparedMutation => {
  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const state = loadPublicMatchState(sql)

  if (state?.playMode === PlayMode.Asynchronous) {
    const applied = finalizeAsyncPlayer(required.play, userId)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Invalid, applied.reason)
    }

    const asyncPlay = applied.play.asyncPlay

    if (asyncPlay !== undefined && bothAsyncPlayersFinalized(asyncPlay)) {
      completeAsyncMatch(sql, applied.play, MatchEndingKind.AsyncResult)
    } else {
      persistAsyncPlayMutation(sql, userId, applied.play)
    }

    return { ok: true }
  }

  if (!required.play.pendingFinalization) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting to be finalized')
  }

  const winnerUserId = resolveMatchWinnerUserId(required.play.session)

  if (winnerUserId !== userId && findPlayer(sql, userId) === null) {
    return commandFailure(CommandErrorCode.Forbidden, 'Not allowed to finish')
  }

  // Either player who is a member can confirm finish (typically the winner).
  completeFromPendingFinalization(sql)
  return { ok: true }
}
