import { DurableObject } from 'cloudflare:workers'
import { LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'
import { isUuid } from '../ids'
import { isJsonObject, isRecord } from '../json'
import { deleteDeadline, dueDeadlineKinds, scheduleEarliestAlarm, upsertDeadline } from './alarms'
import { processAsyncFinalizeAlarm, resolveAsyncDeadline } from './alarmHandlers'
import { broadcast, serializeErrorMessage, serializeStateMessage } from './broadcast'
import { commandFailure, commandSuccess, parseMatchCommand } from './commands'
import { MATCH_USER_HEADER, WAITING_TIMEOUT_MS } from './constants'
import { publishMatchIndex } from './indexSync'
import {
  acceptCancel,
  abandonMatch,
  persistPing as applyPersistPing,
  proposeCancel,
  startAsync,
  withdrawCancel,
} from './lifecycleCommands'
import { completeFromPendingFinalization, persistTerminal } from './matchPersist'
import { correctVisit, finishMatch, recordDarts, recordVisitScore, undoVisit } from './playCommands'
import {
  findOpenSlot,
  findPlayer,
  loadPublicMatchState,
  matchExists,
  migrateMatchSchema,
} from './schema'
import { beginMatch, cancelWaiting, kickPlayer, leaveWaiting } from './waitingCommands'
import { parsePublicDartThrows } from './dartPayload'
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
          persistTerminal(sql, MatchStatus.Cancelled, MatchEndingKind.LobbyTimeout)
        }
      }

      if (kind === DeadlineKind.FinalizeAt) {
        const state = loadPublicMatchState(sql)

        if (state?.status === MatchStatus.Active && state.playMode === PlayMode.Asynchronous) {
          processAsyncFinalizeAlarm(sql, now)
        } else if (state?.status === MatchStatus.Active && state.pendingFinalization) {
          completeFromPendingFinalization(sql)
        }
      }

      if (kind === DeadlineKind.AsyncDeadlineAt) {
        const state = loadPublicMatchState(sql)

        if (state?.status === MatchStatus.Active && state.playMode === PlayMode.Asynchronous) {
          resolveAsyncDeadline(sql, now)
        }
      }
    }

    await this.afterPersist()
  }

  private async persistPing(userId: string): Promise<CommandResult> {
    applyPersistPing(this.ctx.storage.sql, userId)
    const finished = await this.finishMutation()
    return finished
  }

  private async persistCancelWaiting(userId: string): Promise<CommandResult> {
    const prepared = cancelWaiting(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared.result
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistKickPlayer(
    actorUserId: string,
    targetUserId: string,
  ): Promise<CommandResult> {
    const prepared = kickPlayer(this.ctx.storage.sql, actorUserId, targetUserId)

    if (!prepared.ok) {
      return prepared.result
    }

    if (prepared.closeSocketsForUserId !== undefined) {
      this.closeSocketsForUser(prepared.closeSocketsForUserId)
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistLeaveWaiting(userId: string): Promise<CommandResult> {
    const prepared = leaveWaiting(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared.result
    }

    if (prepared.closeSocketsForUserId !== undefined) {
      this.closeSocketsForUser(prepared.closeSocketsForUserId)
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistBeginMatch(userId: string): Promise<CommandResult> {
    const prepared = beginMatch(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistRecordDarts(
    userId: string,
    darts: NonNullable<ReturnType<typeof parsePublicDartThrows>>,
  ): Promise<CommandResult> {
    const prepared = recordDarts(this.ctx.storage.sql, userId, darts)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistRecordVisitScore(userId: string, score: number): Promise<CommandResult> {
    const prepared = recordVisitScore(this.ctx.storage.sql, userId, score)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistUndoVisit(userId: string): Promise<CommandResult> {
    const prepared = undoVisit(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistCorrectVisit(
    userId: string,
    command: Extract<MatchCommand, { name: MatchCommandName.CorrectVisit }>,
  ): Promise<CommandResult> {
    const prepared = correctVisit(this.ctx.storage.sql, userId, command)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistFinishMatch(userId: string): Promise<CommandResult> {
    const prepared = finishMatch(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistStartAsync(userId: string): Promise<CommandResult> {
    const prepared = startAsync(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistAbandonMatch(userId: string): Promise<CommandResult> {
    const prepared = abandonMatch(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistProposeCancel(userId: string): Promise<CommandResult> {
    const prepared = proposeCancel(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistWithdrawCancel(userId: string): Promise<CommandResult> {
    const prepared = withdrawCancel(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private async persistAcceptCancel(userId: string): Promise<CommandResult> {
    const prepared = acceptCancel(this.ctx.storage.sql, userId)

    if (!prepared.ok) {
      return prepared
    }

    const finished = await this.finishMutation()
    return finished
  }

  private closeSocketsForUser(userId: string): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (readSocketUserId(socket) === userId) {
        socket.close(4000, 'left')
      }
    }
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
