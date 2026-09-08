import { DurableObject } from 'cloudflare:workers'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { isUuid } from '../ids'
import { isJsonObject, isRecord } from '../json'
import {
  deleteAllDeadlines,
  deleteDeadline,
  dueDeadlineKinds,
  scheduleEarliestAlarm,
  upsertDeadline,
} from './alarms'
import {
  anyAsyncPendingFinalization,
  applyAsyncRecordDarts,
  applyAsyncRecordVisitScore,
  applyAsyncUndoVisit,
  asyncPlayerIdsByFinalized,
  autoFinalizeDueAsyncPlayers,
  bothAsyncPlayersFinalized,
  createAsyncPlayFromSync,
  earliestAsyncFinalizeAt,
  finalizeAsyncPlayer,
  markPendingAsyncPlayersFinalized,
  resolveAsyncCompletion,
} from './asyncPlay'
import { broadcast, serializeErrorMessage, serializeStateMessage } from './broadcast'
import { commandFailure, commandSuccess, parseMatchCommand } from './commands'
import {
  ASYNC_DEADLINE_MS,
  FINALIZE_TIMEOUT_MS,
  MATCH_USER_HEADER,
  WAITING_TIMEOUT_MS,
} from './constants'
import { canStartAsyncFromInactivity } from './startAsyncEligibility'
import { parsePublicDartThrows } from './dartPayload'
import { publishMatchIndex } from './indexSync'
import {
  deletePlayer,
  findOpenSlot,
  findPlayer,
  loadCreatorUserId,
  loadPlayStateJson,
  loadPublicMatchState,
  matchExists,
  migrateMatchSchema,
  setPlayerLastVisitAt,
  writePlayState,
} from './schema'
import {
  applyCorrectVisit,
  applyRecordDarts,
  applyRecordVisitScore,
  applyUndoVisit,
  createOnlineSession,
  finalizeSession,
  parsePlayState,
  playStateToSessionJson,
  resolveMatchWinnerUserId,
  resolveStartingPlayerSlot,
} from './sessionPlay'
import type { StoredPlayState } from './sessionPlay'
import {
  ClientMessageType,
  CommandErrorCode,
  DeadlineKind,
  MatchCommandName,
  MatchEndingKind,
  MatchStatus,
  PlayMode,
  TERMINAL_STATUSES,
} from './types'
import type {
  CommandResult,
  InitMatchInput,
  JoinMatchInput,
  MatchCommand,
  PublicMatchState,
  TicketInspection,
} from './types'

const publishIndexBestEffort = async (env: Env, state: PublicMatchState): Promise<void> => {
  try {
    await publishMatchIndex(env, state)
  } catch {
    // The next persist retries the index write.
  }
}

const readSocketUserId = (socket: WebSocket): string | null => {
  const attachment: unknown = socket.deserializeAttachment()

  if (!isRecord(attachment) || typeof attachment.userId !== 'string') {
    return null
  }

  return attachment.userId
}

export class MatchObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(() => {
      migrateMatchSchema(this.ctx.storage.sql)
      return Promise.resolve()
    })
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async init(input: InitMatchInput): Promise<CommandResult> {
    const sql = this.ctx.storage.sql

    if (this.ctx.id.name !== input.matchId) {
      return commandFailure(CommandErrorCode.Invalid, 'Match id does not match this object')
    }

    if (matchExists(sql)) {
      return commandFailure(CommandErrorCode.Invalid, 'Match already exists')
    }

    if (!isUuid(input.matchId) || !isUuid(input.creatorUserId) || !isUuid(input.inviteToken)) {
      return commandFailure(
        CommandErrorCode.Invalid,
        'Match, invite, and creator ids must be UUIDs',
      )
    }

    if (input.legsToWin < LEGS_TO_WIN_MIN || input.legsToWin > LEGS_TO_WIN_MAX) {
      return commandFailure(CommandErrorCode.Invalid, 'legsToWin is out of range')
    }

    if (
      input.startingPlayerSlot !== 0 &&
      input.startingPlayerSlot !== 1 &&
      input.startingPlayerSlot !== 2
    ) {
      return commandFailure(
        CommandErrorCode.Invalid,
        'startingPlayerSlot must be 0, 1, or 2 (random)',
      )
    }

    if (!isJsonObject(input.config)) {
      return commandFailure(CommandErrorCode.Invalid, 'config must be an object')
    }

    const now = Date.now()
    const waitingExpiresAt = now + WAITING_TIMEOUT_MS

    sql.exec(
      `
        INSERT INTO match_state (
          id, creator_user_id, status, play_mode, mode, config_json,
          legs_to_win, starting_player_slot, created_at, updated_at,
          started_at, session_json, ending_kind, winner_user_id, invite_token,
          turn_index, pending_finalization, completed_at, result_payload_json, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, 0, NULL, NULL, 1)
      `,
      input.matchId,
      input.creatorUserId,
      MatchStatus.Waiting,
      PlayMode.Synchronous,
      input.mode,
      JSON.stringify(input.config),
      input.legsToWin,
      input.startingPlayerSlot,
      now,
      now,
      input.inviteToken,
    )
    sql.exec(
      `
        INSERT INTO match_players (
          user_id, slot, joined_at, abandoned_at, connected, last_seen_at, last_visit_at
        )
        VALUES (?, 0, ?, NULL, 0, NULL, NULL)
      `,
      input.creatorUserId,
      now,
    )
    upsertDeadline(sql, DeadlineKind.WaitingExpiresAt, waitingExpiresAt)
    // HTTP createMatch awaits publishMatchIndex and rolls back on conflict.
    await this.afterPersist({ publishIndex: false })

    const state = loadPublicMatchState(sql)

    if (state === null) {
      return commandFailure(CommandErrorCode.NotFound, 'Match was not stored')
    }

    return commandSuccess(state)
  }

  inspectForTicket(userId: string): TicketInspection {
    const sql = this.ctx.storage.sql

    if (!matchExists(sql)) {
      return { kind: 'missing' }
    }

    if (findPlayer(sql, userId) === null) {
      return { kind: 'forbidden' }
    }

    return { kind: 'ok' }
  }

  async join(input: JoinMatchInput): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
    const state = loadPublicMatchState(sql)

    if (state === null) {
      return commandFailure(CommandErrorCode.NotFound, 'Match not found')
    }

    if (!isUuid(input.userId)) {
      return commandFailure(CommandErrorCode.Invalid, 'User id must be a UUID')
    }

    if (input.inviteToken !== state.inviteToken) {
      return commandFailure(CommandErrorCode.Forbidden, 'Invite token does not match')
    }

    if (TERMINAL_STATUSES.has(state.status)) {
      return commandFailure(CommandErrorCode.Terminal, 'Match is no longer joinable')
    }

    if (state.status !== MatchStatus.Waiting) {
      return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting')
    }

    if (findPlayer(sql, input.userId) !== null) {
      return commandSuccess(state)
    }

    const slot = findOpenSlot(sql)

    if (slot === null) {
      return commandFailure(CommandErrorCode.Conflict, 'Match is full')
    }

    const now = Date.now()
    sql.exec(
      `
        INSERT INTO match_players (
          user_id, slot, joined_at, abandoned_at, connected, last_seen_at, last_visit_at
        )
        VALUES (?, ?, ?, NULL, 0, NULL, NULL)
      `,
      input.userId,
      slot,
      now,
    )
    sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', now)

    // HTTP joinMatch awaits publishMatchIndex and rolls back on conflict.
    const joined = await this.finishMutation({ publishIndex: false })
    return joined
  }

  async applyCommand(userId: string, command: MatchCommand): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
    const state = loadPublicMatchState(sql)

    if (state === null) {
      return commandFailure(CommandErrorCode.NotFound, 'Match not found')
    }

    if (findPlayer(sql, userId) === null) {
      return commandFailure(CommandErrorCode.Unauthorized, 'Not a member of this match')
    }

    if (command.name !== MatchCommandName.GetState && TERMINAL_STATUSES.has(state.status)) {
      return commandFailure(CommandErrorCode.Terminal, 'Match is no longer in play')
    }

    switch (command.name) {
      case MatchCommandName.GetState:
        return commandSuccess(state)
      case MatchCommandName.Ping: {
        const pingResult = await this.persistPing(userId)
        return pingResult
      }
      case MatchCommandName.CancelWaiting: {
        const cancelResult = await this.persistCancelWaiting(userId)
        return cancelResult
      }
      case MatchCommandName.KickPlayer: {
        const kickResult = await this.persistKickPlayer(userId, command.targetUserId)
        return kickResult
      }
      case MatchCommandName.LeaveWaiting: {
        const leaveResult = await this.persistLeaveWaiting(userId)
        return leaveResult
      }
      case MatchCommandName.BeginMatch: {
        const beginResult = await this.persistBeginMatch(userId)
        return beginResult
      }
      case MatchCommandName.RecordVisit: {
        const darts = parsePublicDartThrows(command.darts)
        if (darts === null) {
          return commandFailure(CommandErrorCode.Invalid, 'Invalid darts payload')
        }
        const recordResult = await this.persistRecordDarts(userId, darts)
        return recordResult
      }
      case MatchCommandName.RecordVisitScore: {
        const scoreResult = await this.persistRecordVisitScore(userId, command.score)
        return scoreResult
      }
      case MatchCommandName.UndoVisit: {
        const undoResult = await this.persistUndoVisit(userId)
        return undoResult
      }
      case MatchCommandName.CorrectVisit: {
        const correctResult = await this.persistCorrectVisit(userId, command)
        return correctResult
      }
      case MatchCommandName.FinishMatch: {
        const finishResult = await this.persistFinishMatch(userId)
        return finishResult
      }
      case MatchCommandName.StartAsync: {
        const startAsyncResult = await this.persistStartAsync(userId)
        return startAsyncResult
      }
      case MatchCommandName.AbandonMatch: {
        const abandonResult = await this.persistAbandonMatch(userId)
        return abandonResult
      }
      case MatchCommandName.ProposeCancel: {
        const proposeResult = await this.persistProposeCancel(userId)
        return proposeResult
      }
      case MatchCommandName.WithdrawCancel: {
        const withdrawResult = await this.persistWithdrawCancel(userId)
        return withdrawResult
      }
      case MatchCommandName.AcceptCancel: {
        const acceptResult = await this.persistAcceptCancel(userId)
        return acceptResult
      }
      default:
        return commandFailure(CommandErrorCode.Invalid, 'Unknown command')
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const userId = request.headers.get(MATCH_USER_HEADER)

    if (userId === null || !isUuid(userId)) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (findPlayer(this.ctx.storage.sql, userId) === null) {
      return new Response('Forbidden', { status: 403 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ userId })
    this.setPlayerConnected(userId, true)
    await this.afterPersist()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const userId = readSocketUserId(socket)

    if (userId === null) {
      socket.send(
        serializeErrorMessage(
          commandFailure(CommandErrorCode.Unauthorized, 'Missing socket identity'),
        ),
      )
      return
    }

    if (typeof message !== 'string') {
      socket.send(
        serializeErrorMessage(
          commandFailure(CommandErrorCode.Invalid, 'Binary messages are not supported'),
        ),
      )
      return
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(message)
    } catch {
      socket.send(
        serializeErrorMessage(
          commandFailure(CommandErrorCode.Invalid, 'Command is not valid JSON'),
        ),
      )
      return
    }

    if (!isRecord(parsed) || parsed.type !== ClientMessageType.Command) {
      socket.send(
        serializeErrorMessage(
          commandFailure(CommandErrorCode.Invalid, 'Expected a command message'),
        ),
      )
      return
    }

    const command = parseMatchCommand(parsed)
    const commandId = typeof parsed.id === 'string' ? parsed.id : undefined

    if (command === null) {
      socket.send(
        serializeErrorMessage(
          commandFailure(CommandErrorCode.Invalid, 'Unknown command'),
          commandId,
        ),
      )
      return
    }

    const result = await this.applyCommand(userId, command)

    if (!result.ok || result.state === null) {
      socket.send(serializeErrorMessage(result, commandId))
      return
    }

    broadcast(this.ctx.getWebSockets(), serializeStateMessage(result.state, commandId))
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    const userId = readSocketUserId(socket)

    if (userId !== null) {
      const stillConnected = this.ctx
        .getWebSockets()
        .some((openSocket) => openSocket !== socket && readSocketUserId(openSocket) === userId)
      this.setPlayerConnected(userId, stillConnected)
      await this.afterPersist()
    }

    socket.close(code, reason)
  }

  async alarm(): Promise<void> {
    const sql = this.ctx.storage.sql
    const now = Date.now()
    const dueKinds = dueDeadlineKinds(sql, now)

    for (const kind of dueKinds) {
      deleteDeadline(sql, kind)

      if (kind === DeadlineKind.WaitingExpiresAt) {
        const state = loadPublicMatchState(sql)

        if (state?.status === MatchStatus.Waiting) {
          this.persistTerminal(MatchStatus.Cancelled, MatchEndingKind.LobbyTimeout)
        }
      }

      if (kind === DeadlineKind.FinalizeAt) {
        const state = loadPublicMatchState(sql)

        if (state?.status === MatchStatus.Active && state.playMode === PlayMode.Asynchronous) {
          this.processAsyncFinalizeAlarm(now)
        } else if (state?.status === MatchStatus.Active && state.pendingFinalization) {
          this.completeFromPendingFinalization()
        }
      }

      if (kind === DeadlineKind.AsyncDeadlineAt) {
        const state = loadPublicMatchState(sql)

        if (state?.status === MatchStatus.Active && state.playMode === PlayMode.Asynchronous) {
          this.resolveAsyncDeadline(now)
        }
      }
    }

    await this.afterPersist()
  }

  private async persistPing(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
    const now = Date.now()
    sql.exec('UPDATE match_players SET last_seen_at = ? WHERE user_id = ?', now, userId)
    sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', now)

    const result = await this.finishMutation()
    return result
  }

  private async persistCancelWaiting(userId: string): Promise<CommandResult> {
    const creatorUserId = loadCreatorUserId(this.ctx.storage.sql)
    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (creatorUserId !== userId) {
      return commandFailure(
        CommandErrorCode.Forbidden,
        'Only the creator can cancel a waiting match',
      )
    }

    if (state?.status !== MatchStatus.Waiting) {
      return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting')
    }

    this.persistTerminal(MatchStatus.Cancelled, MatchEndingKind.CreatorCancel)

    const cancelled = await this.finishMutation()
    return cancelled
  }

  private async persistKickPlayer(
    actorUserId: string,
    targetUserId: string,
  ): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
    const creatorUserId = loadCreatorUserId(sql)
    const state = loadPublicMatchState(sql)

    if (creatorUserId !== actorUserId) {
      return commandFailure(CommandErrorCode.Forbidden, 'Only the creator can kick a player')
    }

    if (state?.status !== MatchStatus.Waiting) {
      return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting')
    }

    if (!isUuid(targetUserId)) {
      return commandFailure(CommandErrorCode.Invalid, 'Target user id must be a UUID')
    }

    if (targetUserId === creatorUserId) {
      return commandFailure(CommandErrorCode.Invalid, 'The creator cannot be kicked')
    }

    if (findPlayer(sql, targetUserId) === null) {
      return commandFailure(CommandErrorCode.NotFound, 'Player is not in this match')
    }

    deletePlayer(sql, targetUserId)
    sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', Date.now())
    this.closeSocketsForUser(targetUserId)

    const kicked = await this.finishMutation()
    return kicked
  }

  private async persistLeaveWaiting(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
    const creatorUserId = loadCreatorUserId(sql)
    const state = loadPublicMatchState(sql)

    if (state?.status !== MatchStatus.Waiting) {
      return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting')
    }

    if (userId === creatorUserId) {
      return commandFailure(
        CommandErrorCode.Forbidden,
        'The creator must cancel the match instead of leaving',
      )
    }

    deletePlayer(sql, userId)
    sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', Date.now())
    this.closeSocketsForUser(userId)

    const left = await this.finishMutation()
    return left
  }

  private async persistBeginMatch(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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

    const started = await this.finishMutation()
    return started
  }

  private requireActivePlay():
    { ok: true; play: ReturnType<typeof parsePlayState> } | { ok: false; result: CommandResult } {
    const sql = this.ctx.storage.sql
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

  private async persistRecordDarts(
    userId: string,
    darts: NonNullable<ReturnType<typeof parsePublicDartThrows>>,
  ): Promise<CommandResult> {
    const required = this.requireActivePlay()

    if (!required.ok) {
      return required.result
    }

    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (state?.playMode === PlayMode.Asynchronous) {
      const applied = applyAsyncRecordDarts(required.play, userId, darts, FINALIZE_TIMEOUT_MS)

      if (!applied.ok) {
        return commandFailure(CommandErrorCode.Forbidden, applied.reason)
      }

      this.persistAsyncPlayMutation(userId, applied.play)
      const result = await this.finishMutation()
      return result
    }

    const applied = applyRecordDarts(required.play, userId, darts)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    this.persistPlayMutation(userId, applied.play)
    const result = await this.finishMutation()
    return result
  }

  private async persistRecordVisitScore(userId: string, score: number): Promise<CommandResult> {
    const required = this.requireActivePlay()

    if (!required.ok) {
      return required.result
    }

    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (state?.playMode === PlayMode.Asynchronous) {
      const applied = applyAsyncRecordVisitScore(required.play, userId, score, FINALIZE_TIMEOUT_MS)

      if (!applied.ok) {
        return commandFailure(CommandErrorCode.Forbidden, applied.reason)
      }

      this.persistAsyncPlayMutation(userId, applied.play)
      const result = await this.finishMutation()
      return result
    }

    const applied = applyRecordVisitScore(required.play, userId, score)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    this.persistPlayMutation(userId, applied.play)
    const result = await this.finishMutation()
    return result
  }

  private async persistUndoVisit(userId: string): Promise<CommandResult> {
    const required = this.requireActivePlay()

    if (!required.ok) {
      return required.result
    }

    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (state?.playMode === PlayMode.Asynchronous) {
      const applied = applyAsyncUndoVisit(required.play, userId)

      if (!applied.ok) {
        return commandFailure(CommandErrorCode.Forbidden, applied.reason)
      }

      this.persistAsyncPlayMutation(userId, applied.play)
      const result = await this.finishMutation()
      return result
    }

    const applied = applyUndoVisit(required.play, userId)

    if (!applied.ok) {
      return commandFailure(CommandErrorCode.Forbidden, applied.reason)
    }

    const sql = this.ctx.storage.sql
    writePlayState(sql, playStateToSessionJson(applied.play), applied.play.turnIndex, false)
    deleteDeadline(sql, DeadlineKind.FinalizeAt)

    const result = await this.finishMutation()
    return result
  }

  private async persistCorrectVisit(
    userId: string,
    command: Extract<MatchCommand, { name: MatchCommandName.CorrectVisit }>,
  ): Promise<CommandResult> {
    const required = this.requireActivePlay()

    if (!required.ok) {
      return required.result
    }

    const state = loadPublicMatchState(this.ctx.storage.sql)

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

      this.persistPlayMutation(userId, applied.play)
      const result = await this.finishMutation()
      return result
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

    this.persistPlayMutation(userId, applied.play)
    const result = await this.finishMutation()
    return result
  }

  private async persistFinishMatch(userId: string): Promise<CommandResult> {
    const required = this.requireActivePlay()

    if (!required.ok) {
      return required.result
    }

    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (state?.playMode === PlayMode.Asynchronous) {
      const applied = finalizeAsyncPlayer(required.play, userId)

      if (!applied.ok) {
        return commandFailure(CommandErrorCode.Invalid, applied.reason)
      }

      const asyncPlay = applied.play.asyncPlay

      if (asyncPlay !== undefined && bothAsyncPlayersFinalized(asyncPlay)) {
        this.completeAsyncMatch(applied.play, MatchEndingKind.AsyncResult)
      } else {
        this.persistAsyncPlayMutation(userId, applied.play)
      }

      const result = await this.finishMutation()
      return result
    }

    if (!required.play.pendingFinalization) {
      return commandFailure(CommandErrorCode.Invalid, 'Match is not waiting to be finalized')
    }

    const winnerUserId = resolveMatchWinnerUserId(required.play.session)

    if (winnerUserId !== userId && findPlayer(this.ctx.storage.sql, userId) === null) {
      return commandFailure(CommandErrorCode.Forbidden, 'Not allowed to finish')
    }

    // Either player who is a member can confirm finish (typically the winner).
    this.completeFromPendingFinalization()
    const result = await this.finishMutation()
    return result
  }

  private async persistStartAsync(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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

    const required = this.requireActivePlay()

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

    const started = await this.finishMutation()
    return started
  }

  private async persistAbandonMatch(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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
    this.persistCompleted(
      MatchEndingKind.Abandon,
      opponent.userId,
      play === null
        ? { winnerUserId: opponent.userId }
        : { session: play.session, winnerUserId: opponent.userId },
    )

    const abandoned = await this.finishMutation()
    return abandoned
  }

  private async persistProposeCancel(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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

    const proposed = await this.finishMutation()
    return proposed
  }

  private async persistWithdrawCancel(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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

    const withdrawn = await this.finishMutation()
    return withdrawn
  }

  private async persistAcceptCancel(userId: string): Promise<CommandResult> {
    const sql = this.ctx.storage.sql
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

    this.persistCancelled(MatchEndingKind.MutualCancel)

    const accepted = await this.finishMutation()
    return accepted
  }

  private persistPlayMutation(actorUserId: string, play: StoredPlayState): void {
    const sql = this.ctx.storage.sql
    const now = Date.now()
    writePlayState(sql, playStateToSessionJson(play), play.turnIndex, play.pendingFinalization)
    setPlayerLastVisitAt(sql, actorUserId, now)

    if (play.pendingFinalization) {
      upsertDeadline(sql, DeadlineKind.FinalizeAt, now + FINALIZE_TIMEOUT_MS)
    } else {
      deleteDeadline(sql, DeadlineKind.FinalizeAt)
    }
  }

  private persistAsyncPlayMutation(actorUserId: string, play: StoredPlayState): void {
    const sql = this.ctx.storage.sql
    const now = Date.now()
    const pending = play.asyncPlay !== undefined && anyAsyncPendingFinalization(play.asyncPlay)
    writePlayState(sql, playStateToSessionJson(play), play.turnIndex, pending)
    setPlayerLastVisitAt(sql, actorUserId, now)
    this.scheduleAsyncFinalizeDeadline(play)
  }

  private scheduleAsyncFinalizeDeadline(play: StoredPlayState): void {
    const sql = this.ctx.storage.sql

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

  private processAsyncFinalizeAlarm(now: number): void {
    const sql = this.ctx.storage.sql
    const sessionJson = loadPlayStateJson(sql)

    if (sessionJson === null) {
      return
    }

    const play = autoFinalizeDueAsyncPlayers(parsePlayState(sessionJson), now)

    if (play.asyncPlay !== undefined && bothAsyncPlayersFinalized(play.asyncPlay)) {
      this.completeAsyncMatch(play, MatchEndingKind.AsyncResult)
      return
    }

    writePlayState(
      sql,
      playStateToSessionJson(play),
      play.turnIndex,
      play.asyncPlay !== undefined && anyAsyncPendingFinalization(play.asyncPlay),
    )
    this.scheduleAsyncFinalizeDeadline(play)
  }

  private resolveAsyncDeadline(now: number): void {
    const sql = this.ctx.storage.sql
    const sessionJson = loadPlayStateJson(sql)

    if (sessionJson === null) {
      return
    }

    const play = markPendingAsyncPlayersFinalized(parsePlayState(sessionJson))
    const asyncPlay = play.asyncPlay

    if (asyncPlay === undefined) {
      return
    }

    const { finalized, unfinished } = asyncPlayerIdsByFinalized(asyncPlay)

    if (finalized.length === 2) {
      this.completeAsyncMatch(play, MatchEndingKind.AsyncResult)
      return
    }

    if (finalized.length === 1 && unfinished.length === 1) {
      const winnerUserId = finalized[0]
      const loserUserId = unfinished[0]

      if (winnerUserId === undefined || loserUserId === undefined) {
        return
      }

      sql.exec('UPDATE match_players SET abandoned_at = ? WHERE user_id = ?', now, loserUserId)
      writePlayState(sql, playStateToSessionJson(play), play.turnIndex, false)
      this.persistCompleted(MatchEndingKind.AsyncTimeout, winnerUserId, {
        session: play.session,
        asyncPlay,
        winnerUserId,
      })
      return
    }

    writePlayState(sql, playStateToSessionJson(play), play.turnIndex, false)
    this.persistCancelled(MatchEndingKind.MutualCancel)
  }

  private completeAsyncMatch(play: StoredPlayState, endingKind: MatchEndingKind): void {
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

    writePlayState(this.ctx.storage.sql, playStateToSessionJson(play), play.turnIndex, false)
    this.persistCompleted(endingKind, resolved.winnerUserId, resultPayload)
  }

  private completeFromPendingFinalization(): void {
    const sql = this.ctx.storage.sql
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

  private closeSocketsForUser(userId: string): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (readSocketUserId(socket) === userId) {
        socket.close(4000, 'left')
      }
    }
  }

  private persistCompleted(
    endingKind: MatchEndingKind,
    winnerUserId: string,
    resultPayload: Record<string, unknown> | null,
  ): void {
    const sql = this.ctx.storage.sql
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

  private persistCancelled(endingKind: MatchEndingKind): void {
    const sql = this.ctx.storage.sql
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

  private persistTerminal(status: MatchStatus, endingKind: MatchEndingKind): void {
    const sql = this.ctx.storage.sql
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

  private async finishMutation(options: { publishIndex?: boolean } = {}): Promise<CommandResult> {
    const state = loadPublicMatchState(this.ctx.storage.sql)

    if (state === null) {
      return commandFailure(CommandErrorCode.NotFound, 'Match not found')
    }

    await this.afterPersist(options)

    return commandSuccess(state)
  }

  private setPlayerConnected(userId: string, connected: boolean): void {
    const now = Date.now()
    this.ctx.storage.sql.exec(
      `
        UPDATE match_players
        SET connected = ?, last_seen_at = ?
        WHERE user_id = ?
      `,
      connected ? 1 : 0,
      now,
      userId,
    )
    this.ctx.storage.sql.exec('UPDATE match_state SET updated_at = ?, version = version + 1', now)
  }

  private async afterPersist(options: { publishIndex?: boolean } = {}): Promise<void> {
    const state = loadPublicMatchState(this.ctx.storage.sql)
    const publishIndex = options.publishIndex !== false

    if (state !== null) {
      broadcast(this.ctx.getWebSockets(), serializeStateMessage(state))

      if (publishIndex) {
        this.ctx.waitUntil(publishIndexBestEffort(this.env, state))
      }
    }

    if (state !== null && TERMINAL_STATUSES.has(state.status)) {
      for (const socket of this.ctx.getWebSockets()) {
        socket.close(1000, 'match ended')
      }

      await this.ctx.storage.deleteAlarm()
      return
    }

    await scheduleEarliestAlarm(this.ctx)
  }
}
