import { createAsyncPlayFromSync } from './asyncPlay'
import { commandFailure } from './commands'
import { ASYNC_DEADLINE_MS } from './constants'
import { persistCancelled, persistCompleted, requireActivePlay } from './matchPersist'
import { deleteDeadline, upsertDeadline } from './alarms'
import { canStartAsyncFromInactivity } from './startAsyncEligibility'
import { loadPlayStateJson, loadPublicMatchState } from './schema'
import { parsePlayState, playStateToSessionJson } from './sessionPlay'
import type { StoredPlayState } from './sessionPlay'
import { CommandErrorCode, DeadlineKind, MatchEndingKind, MatchStatus, PlayMode } from './types'
import type { PreparedMutation } from './playCommands'

export const startAsync = (sql: SqlStorage, userId: string): PreparedMutation => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not active')
  }

  if (state.playMode !== PlayMode.Synchronous) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is already asynchronous')
  }

  if (state.pendingFinalization) {
    return commandFailure(CommandErrorCode.Invalid, 'Cannot start async during finalization')
  }

  const opponent = state.players.find((player) => player.userId !== userId) ?? null

  if (
    !canStartAsyncFromInactivity({
      nowMs: Date.now(),
      matchStartedAt: state.startedAt,
      activePlayerId: state.activePlayerId,
      opponent,
      players: state.players,
    })
  ) {
    return commandFailure(
      CommandErrorCode.Invalid,
      'Opponent is still active; wait for disconnect or a stalled turn',
    )
  }

  const required = requireActivePlay(sql)

  if (!required.ok) {
    return required.result
  }

  const asyncPlay = createAsyncPlayFromSync(required.play)
  const nextPlay: StoredPlayState = {
    ...required.play,
    pendingFinalization: false,
    asyncPlay,
  }
  const now = Date.now()
  const asyncDeadlineAt = now + ASYNC_DEADLINE_MS

  sql.exec(
    `
      UPDATE match_state
      SET play_mode = ?, async_started_at = ?, darts_owner_user_id = ?,
          session_json = ?, turn_index = ?, pending_finalization = 0,
          updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    PlayMode.Asynchronous,
    now,
    asyncPlay.dartsOwnerId,
    playStateToSessionJson(nextPlay),
    nextPlay.turnIndex,
    now,
  )
  deleteDeadline(sql, DeadlineKind.FinalizeAt)
  upsertDeadline(sql, DeadlineKind.AsyncDeadlineAt, asyncDeadlineAt)

  return { ok: true }
}

export const abandonMatch = (sql: SqlStorage, userId: string): PreparedMutation => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not active')
  }

  const opponent = state.players.find((player) => player.userId !== userId)

  if (opponent === undefined) {
    return commandFailure(CommandErrorCode.Invalid, 'Match needs an opponent to abandon')
  }

  const now = Date.now()
  sql.exec('UPDATE match_players SET abandoned_at = ? WHERE user_id = ?', now, userId)

  const sessionJson = loadPlayStateJson(sql)
  const play = sessionJson === null ? null : parsePlayState(sessionJson)
  persistCompleted(
    sql,
    MatchEndingKind.Abandon,
    opponent.userId,
    play === null
      ? { winnerUserId: opponent.userId }
      : { session: play.session, winnerUserId: opponent.userId },
  )

  return { ok: true }
}

export const proposeCancel = (sql: SqlStorage, userId: string): PreparedMutation => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not active')
  }

  if (state.cancelProposalUserId !== null) {
    return commandFailure(CommandErrorCode.Conflict, 'A cancel proposal is already open')
  }

  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET cancel_proposal_user_id = ?, updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    userId,
    now,
  )

  return { ok: true }
}

export const withdrawCancel = (sql: SqlStorage, userId: string): PreparedMutation => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not active')
  }

  if (state.cancelProposalUserId === null) {
    return commandFailure(CommandErrorCode.Invalid, 'No cancel proposal to withdraw')
  }

  if (state.cancelProposalUserId !== userId) {
    return commandFailure(CommandErrorCode.Forbidden, 'Only the proposer can withdraw')
  }

  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET cancel_proposal_user_id = NULL, updated_at = ?, version = version + 1
      WHERE id IS NOT NULL
    `,
    now,
  )

  return { ok: true }
}

export const acceptCancel = (sql: SqlStorage, userId: string): PreparedMutation => {
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Active) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not active')
  }

  if (state.cancelProposalUserId === null) {
    return commandFailure(CommandErrorCode.Invalid, 'No cancel proposal to accept')
  }

  if (state.cancelProposalUserId === userId) {
    return commandFailure(CommandErrorCode.Forbidden, 'Cannot accept your own cancel proposal')
  }

  persistCancelled(sql, MatchEndingKind.MutualCancel)

  return { ok: true }
}

export const persistPing = (sql: SqlStorage, userId: string): PreparedMutation => {
  const now = Date.now()
  sql.exec('UPDATE match_players SET last_seen_at = ? WHERE user_id = ?', now, userId)
  sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', now)

  return { ok: true }
}
