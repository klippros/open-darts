import type { GameConfig } from '@open-darts/game/types/gameMode'

export enum OnlineMatchInviteStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
  Superseded = 'superseded',
}

export enum OnlineMatchInviteOutcome {
  AcceptedForJoin = 'accepted_for_join',
  Declined = 'declined',
  Unavailable = 'unavailable',
}

export interface FollowedPlayerForInvite {
  userId: string
  displayName: string
  rank: number
  relevanceScore: number
  playCount: number
  lastPlayedAt: string | null
  rankedAt: string
}

export interface PendingOnlineMatchInvite {
  inviteId: string
  matchId: string
  inviterUserId: string
  inviterDisplayName: string
  mode: string
  config: GameConfig
  legsToWin: number
  createdAt: string
}

export interface OnlineMatchInviteHostRow {
  inviteId: string
  inviteeUserId: string
  inviteeDisplayName: string
  status: OnlineMatchInviteStatus
  createdAt: string
  respondedAt: string | null
  resolvedAt: string | null
}

export interface OnlineMatchInviteAccept {
  matchId: string
  inviteToken: string | null
  outcome: OnlineMatchInviteOutcome
}
