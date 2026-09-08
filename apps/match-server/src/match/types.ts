import type { GameConfig, GameModeId } from '@open-darts/game/types/gameMode'
import type { JsonObject } from '../json'

export enum MatchStatus {
  Waiting = 'waiting',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum PlayMode {
  Synchronous = 'synchronous',
  Asynchronous = 'asynchronous',
}

export enum DeadlineKind {
  WaitingExpiresAt = 'waiting_expires_at',
  FinalizeAt = 'finalize_at',
  AsyncDeadlineAt = 'async_deadline_at',
}

export enum MatchEndingKind {
  Checkout = 'checkout',
  AsyncResult = 'async_result',
  Abandon = 'abandon',
  AsyncTimeout = 'async_timeout',
  MutualCancel = 'mutual_cancel',
  LobbyTimeout = 'lobby_timeout',
  CreatorCancel = 'creator_cancel',
}

export enum MatchCommandName {
  GetState = 'get_state',
  Ping = 'ping',
  CancelWaiting = 'cancel_waiting',
  KickPlayer = 'kick_player',
  LeaveWaiting = 'leave_waiting',
  BeginMatch = 'begin_match',
  RecordVisit = 'record_visit',
  RecordVisitScore = 'record_visit_score',
  UndoVisit = 'undo_visit',
  CorrectVisit = 'correct_visit',
  FinishMatch = 'finish_match',
  StartAsync = 'start_async',
  AbandonMatch = 'abandon_match',
  ProposeCancel = 'propose_cancel',
  WithdrawCancel = 'withdraw_cancel',
  AcceptCancel = 'accept_cancel',
}

export enum CommandErrorCode {
  NotFound = 'not_found',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  Terminal = 'terminal',
  Invalid = 'invalid',
  Conflict = 'conflict',
}

export enum ClientMessageType {
  Command = 'command',
}

export enum ServerMessageType {
  State = 'state',
  Error = 'error',
}

export type MatchCommand =
  | { name: MatchCommandName.GetState }
  | { name: MatchCommandName.Ping }
  | { name: MatchCommandName.CancelWaiting }
  | { name: MatchCommandName.KickPlayer; targetUserId: string }
  | { name: MatchCommandName.LeaveWaiting }
  | { name: MatchCommandName.BeginMatch }
  | { name: MatchCommandName.RecordVisit; darts: PublicDartThrow[] }
  | { name: MatchCommandName.RecordVisitScore; score: number }
  | { name: MatchCommandName.UndoVisit }
  | {
      name: MatchCommandName.CorrectVisit
      visitIndex: number
      darts?: PublicDartThrow[]
      visitScore?: number
    }
  | { name: MatchCommandName.FinishMatch }
  | { name: MatchCommandName.StartAsync }
  | { name: MatchCommandName.AbandonMatch }
  | { name: MatchCommandName.ProposeCancel }
  | { name: MatchCommandName.WithdrawCancel }
  | { name: MatchCommandName.AcceptCancel }

export interface PublicDartThrow {
  segment: { type: string; value?: number }
  multiplier: string
  points: number
  timestamp: string
}

export interface MatchPlayerSnapshot {
  userId: string
  slot: 0 | 1
  connected: boolean
  lastSeenAt: number | null
  lastVisitAt: number | null
}

export interface MatchDeadlineSnapshot {
  kind: DeadlineKind
  fireAt: number
}

export interface PublicMatchState {
  matchId: string
  inviteToken: string
  creatorUserId: string
  status: MatchStatus
  playMode: PlayMode
  mode: GameModeId
  config: JsonObject
  legsToWin: number
  startingPlayerSlot: 0 | 1
  players: MatchPlayerSnapshot[]
  deadlines: MatchDeadlineSnapshot[]
  endingKind: MatchEndingKind | null
  winnerUserId: string | null
  createdAt: number
  startedAt: number | null
  completedAt: number | null
  sessionJson: string | null
  turnIndex: number | null
  activePlayerId: string | null
  pendingFinalization: boolean
  resultPayloadJson: string | null
  cancelProposalUserId: string | null
  asyncStartedAt: number | null
  dartsOwnerUserId: string | null
  asyncStateJson: string | null
  version: number
}

export interface CommandResult {
  ok: boolean
  state: PublicMatchState | null
  code: CommandErrorCode | null
  message: string | null
}

export interface InitMatchInput {
  matchId: string
  inviteToken: string
  creatorUserId: string
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: 0 | 1
}

export interface JoinMatchInput {
  userId: string
  inviteToken: string
}

export type TicketInspection = { kind: 'missing' } | { kind: 'forbidden' } | { kind: 'ok' }

export const TERMINAL_STATUSES: ReadonlySet<MatchStatus> = new Set([
  MatchStatus.Completed,
  MatchStatus.Cancelled,
])

export const isDeadlineKind = (value: string): value is DeadlineKind =>
  (Object.values(DeadlineKind) as string[]).includes(value)
