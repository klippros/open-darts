import { deleteAllDeadlines, deleteDeadline, upsertDeadline } from './alarms'
import {
  anyAsyncPendingFinalization,
  earliestAsyncFinalizeAt,
  resolveAsyncCompletion,
} from './asyncPlay'
import { commandFailure } from './commands'
import { FINALIZE_TIMEOUT_MS } from './constants'
import {
  loadPlayStateJson,
  loadPublicMatchState,
  setPlayerLastVisitAt,
  writePlayState,
} from './schema'
import {
  finalizeSession,
  parsePlayState,
  playStateToSessionJson,
  resolveMatchWinnerUserId,
} from './sessionPlay'
import type { StoredPlayState } from './sessionPlay'
import { CommandErrorCode, DeadlineKind, MatchEndingKind, MatchStatus } from './types'
import type { CommandResult } from './types'

export const requireActivePlay = (
  sql: SqlStorage,
): { ok: true; play: ReturnType<typeof parsePlayState> } | { ok: false; result: CommandResult } => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Match is not active'),
    }
  }

  const sessionJson = loadPlayStateJson(sql)

  if (sessionJson === null) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Match has no session'),
    }
  }

  return { ok: true, play: parsePlayState(sessionJson) }
}

export const persistPlayMutation = (
  sql: SqlStorage,
  actorUserId: string,
  play: StoredPlayState,
): void => {
  const now = Date.now()
  writePlayState(sql, playStateToSessionJson(play), play.turnIndex, play.pendingFinalization)
  setPlayerLastVisitAt(sql, actorUserId, now)

  if (play.pendingFinalization) {
    upsertDeadline(sql, DeadlineKind.FinalizeAt, now + FINALIZE_TIMEOUT_MS)
  } else {
    deleteDeadline(sql, DeadlineKind.FinalizeAt)
  }
}

export const scheduleAsyncFinalizeDeadline = (sql: SqlStorage, play: StoredPlayState): void => {
  if (play.asyncPlay === undefined) {
    deleteDeadline(sql, DeadlineKind.FinalizeAt)
    return
  }

  const next = earliestAsyncFinalizeAt(play.asyncPlay)

  if (next === null) {
    deleteDeadline(sql, DeadlineKind.FinalizeAt)
    return
  }

  upsertDeadline(sql, DeadlineKind.FinalizeAt, next)
}

export const persistAsyncPlayMutation = (
  sql: SqlStorage,
  actorUserId: string,
  play: StoredPlayState,
): void => {
  const now = Date.now()
  const pending = play.asyncPlay !== undefined && anyAsyncPendingFinalization(play.asyncPlay)
  writePlayState(sql, playStateToSessionJson(play), play.turnIndex, pending)
  setPlayerLastVisitAt(sql, actorUserId, now)
  scheduleAsyncFinalizeDeadline(sql, play)
}

export const persistCompleted = (
  sql: SqlStorage,
  endingKind: MatchEndingKind,
  winnerUserId: string,
  resultPayload: Record<string, unknown> | null,
): void => {
  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET status = ?, ending_kind = ?, winner_user_id = ?, completed_at = ?,
          cancel_proposal_user_id = NULL, pending_finalization = 0,
          result_payload_json = ?, updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    MatchStatus.Completed,
    endingKind,
    winnerUserId,
    now,
    resultPayload === null ? null : JSON.stringify(resultPayload),
    now,
  )
  deleteAllDeadlines(sql)
}

export const persistCancelled = (sql: SqlStorage, endingKind: MatchEndingKind): void => {
  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET status = ?, ending_kind = ?, winner_user_id = NULL, completed_at = ?,
          cancel_proposal_user_id = NULL, pending_finalization = 0,
          updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    MatchStatus.Cancelled,
    endingKind,
    now,
    now,
  )
  deleteAllDeadlines(sql)
}

export const persistTerminal = (
  sql: SqlStorage,
  status: MatchStatus,
  endingKind: MatchEndingKind,
): void => {
  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET status = ?, ending_kind = ?, updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    status,
    endingKind,
    now,
  )
  deleteAllDeadlines(sql)
}

export const completeFromPendingFinalization = (sql: SqlStorage): void => {
  const sessionJson = loadPlayStateJson(sql)

  if (sessionJson === null) {
    return
  }

  const play = finalizeSession(parsePlayState(sessionJson))
  const winnerUserId = resolveMatchWinnerUserId(play.session)
  const now = Date.now()
  const resultPayload = JSON.stringify({
    session: play.session,
    winnerUserId,
  })

  sql.exec(
    `
      UPDATE match_state
      SET status = ?, ending_kind = ?, winner_user_id = ?, completed_at = ?,
          session_json = ?, turn_index = ?, pending_finalization = 0,
          result_payload_json = ?, updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    MatchStatus.Completed,
    MatchEndingKind.Checkout,
    winnerUserId,
    now,
    playStateToSessionJson(play),
    play.turnIndex,
    resultPayload,
    now,
  )
  deleteAllDeadlines(sql)
}

export const completeAsyncMatch = (
  sql: SqlStorage,
  play: StoredPlayState,
  endingKind: MatchEndingKind,
): void => {
  const resolved = resolveAsyncCompletion(play)

  if (resolved === null) {
    return
  }

  const resultPayload = {
    session: play.session,
    asyncPlay: play.asyncPlay,
    winnerUserId: resolved.winnerUserId,
    visits: resolved.visits,
  }

  writePlayState(sql, playStateToSessionJson(play), play.turnIndex, false)
  persistCompleted(sql, endingKind, resolved.winnerUserId, resultPayload)
}
