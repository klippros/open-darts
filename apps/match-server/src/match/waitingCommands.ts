import type { GameConfig } from '@open-darts/game/types/gameMode'
import { isUuid } from '../ids'
import { commandFailure } from './commands'
import { deleteDeadline } from './alarms'
import { persistTerminal } from './matchPersist'
import { deletePlayer, findPlayer, loadCreatorUserId, loadPublicMatchState } from './schema'
import {
  createOnlineSession,
  playStateToSessionJson,
  resolveStartingPlayerSlot,
} from './sessionPlay'
import { CommandErrorCode, DeadlineKind, MatchEndingKind, MatchStatus } from './types'
import type { CommandResult } from './types'
import type { PreparedMutation } from './playCommands'

export type WaitingMutationResult =
  { ok: true; closeSocketsForUserId?: string } | { ok: false; result: CommandResult }

export const cancelWaiting = (sql: SqlStorage, userId: string): WaitingMutationResult => {
  const creatorUserId = loadCreatorUserId(sql)
  const state = loadPublicMatchState(sql)

  if (creatorUserId !== userId) {
    return {
      ok: false,
      result: commandFailure(
        CommandErrorCode.Forbidden,
        'Only the creator can cancel a waiting match',
      ),
    }
  }

  if (state?.status !== MatchStatus.Waiting) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Match is not waiting'),
    }
  }

  persistTerminal(sql, MatchStatus.Cancelled, MatchEndingKind.CreatorCancel)

  return { ok: true }
}

export const kickPlayer = (
  sql: SqlStorage,
  actorUserId: string,
  targetUserId: string,
): WaitingMutationResult => {
  const creatorUserId = loadCreatorUserId(sql)
  const state = loadPublicMatchState(sql)

  if (creatorUserId !== actorUserId) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Forbidden, 'Only the creator can kick a player'),
    }
  }

  if (state?.status !== MatchStatus.Waiting) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Match is not waiting'),
    }
  }

  if (!isUuid(targetUserId)) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Target user id must be a UUID'),
    }
  }

  if (targetUserId === creatorUserId) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'The creator cannot be kicked'),
    }
  }

  if (findPlayer(sql, targetUserId) === null) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.NotFound, 'Player is not in this match'),
    }
  }

  deletePlayer(sql, targetUserId)
  sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', Date.now())

  return { ok: true, closeSocketsForUserId: targetUserId }
}

export const leaveWaiting = (sql: SqlStorage, userId: string): WaitingMutationResult => {
  const creatorUserId = loadCreatorUserId(sql)
  const state = loadPublicMatchState(sql)

  if (state?.status !== MatchStatus.Waiting) {
    return {
      ok: false,
      result: commandFailure(CommandErrorCode.Invalid, 'Match is not waiting'),
    }
  }

  if (userId === creatorUserId) {
    return {
      ok: false,
      result: commandFailure(
        CommandErrorCode.Forbidden,
        'The creator must cancel the match instead of leaving',
      ),
    }
  }

  deletePlayer(sql, userId)
  sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', Date.now())

  return { ok: true, closeSocketsForUserId: userId }
}

export const beginMatch = (sql: SqlStorage, userId: string): PreparedMutation => {
  const creatorUserId = loadCreatorUserId(sql)
  const state = loadPublicMatchState(sql)

  if (creatorUserId !== userId) {
    return commandFailure(CommandErrorCode.Forbidden, 'Only the creator can start the match')
  }

  if (state?.status !== MatchStatus.Waiting) {
    return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting')
  }

  if (state.players.length !== 2) {
    return commandFailure(CommandErrorCode.Invalid, 'Match needs two players to start')
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- online config is GameConfig shaped
  const config = state.config as unknown as GameConfig
  const startingPlayerSlot = resolveStartingPlayerSlot(state.startingPlayerSlot)
  const play = createOnlineSession({
    matchId: state.matchId,
    mode: state.mode,
    config,
    legsToWin: state.legsToWin,
    startingPlayerSlot,
    players: state.players,
  })

  const now = Date.now()
  sql.exec(
    `
      UPDATE match_state
      SET status = ?, started_at = ?, session_json = ?, turn_index = ?,
          starting_player_slot = ?, pending_finalization = 0, updated_at = ?,
          version = version + 1
      WHERE id IS NOT NULL
    `,
    MatchStatus.Active,
    now,
    playStateToSessionJson(play),
    play.turnIndex,
    startingPlayerSlot,
    now,
  )
  deleteDeadline(sql, DeadlineKind.WaitingExpiresAt)

  return { ok: true }
}
