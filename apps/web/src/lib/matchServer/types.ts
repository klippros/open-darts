import type { GameConfig, GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'

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

export enum MatchPlayerSlot {
  Creator = 0,
  Joiner = 1,
  /** Resolved to Creator or Joiner when the match begins. */
  Random = 2,
}

export interface PublicDartThrow {
  segment: { type: string; value?: number }
  multiplier: string
  points: number
  timestamp: string
}

export interface MatchPlayerSnapshot {
  userId: string
  slot: MatchPlayerSlot
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
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: MatchPlayerSlot
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

export interface CreateMatchRequest {
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: MatchPlayerSlot
}

export interface CreateMatchResponse {
  matchId: string
  inviteToken: string
  state: PublicMatchState
}

export interface JoinMatchResponse {
  matchId: string
  state: PublicMatchState
}

export interface MatchTicketResponse {
  token: string
  expiresAt: number
}

export interface OnlineMatchInvite {
  matchId: string
  status: string
  creatorUserId: string
  creatorDisplayName: string
  mode: string
  config: GameConfig
  legsToWin: number
  startingPlayerSlot: number
  playerCount: number
}

export interface InProgressOnlineMatchRow {
  id: string
  status: MatchStatus
  mode: string
  legs_to_win: number
  invite_token: string
}

export interface OnlineMatchHistoryRow {
  id: string
  status: MatchStatus
  playMode: PlayMode
  mode: GameModeId
  config: GameConfig
  legsToWin: number
  endingKind: MatchEndingKind
  winnerUserId: string | null
  creatorUserId: string
  completedAt: string | null
  createdAt: string
  opponentUserId: string | null
  /** Present when the match server stored a full session in result_payload. */
  session: GameSession | null
}

export interface ClientCommandMessage {
  type: ClientMessageType.Command
  id?: string
  name: MatchCommandName
  targetUserId?: string
  darts?: PublicDartThrow[]
  score?: number
  visitIndex?: number
  visitScore?: number
}

export type ServerMessage =
  | { type: ServerMessageType.State; id?: string; state: PublicMatchState }
  | {
      type: ServerMessageType.Error
      id?: string
      code: CommandErrorCode | string | null
      message: string | null
    }

export const V1_ONLINE_X01_CONFIG = {
  startScore: 501,
  doubleIn: false,
  doubleOut: true,
} as const
