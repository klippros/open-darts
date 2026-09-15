import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import type { GameSession } from '@open-darts/game/types/gameSession'
import {
  decorateOnlineSessionForViewer,
  parseOnlinePlaySnapshot,
  resolveCompletedOnlineSession,
} from './onlinePlay'
import { toPublicDartThrow } from './toPublicDartThrow'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { MatchEndingKind, MatchPlayerSlot, MatchStatus, PlayMode } from './types'
import type { PublicMatchState } from './types'

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'match-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [
    { id: 'user-a', name: 'Player 1', kind: PlayerKind.Remote },
    { id: 'user-b', name: 'Player 2', kind: PlayerKind.Remote },
  ],
  visits: [],
  status: GameStatus.InProgress,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const sampleMatchState = (overrides: Partial<PublicMatchState> = {}): PublicMatchState => ({
  matchId: 'match-1',
  inviteToken: 'invite',
  creatorUserId: 'user-a',
  status: MatchStatus.Completed,
  playMode: PlayMode.Asynchronous,
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  legsToWin: 1,
  startingPlayerSlot: MatchPlayerSlot.Creator,
  players: [],
  deadlines: [],
  endingKind: MatchEndingKind.AsyncResult,
  winnerUserId: 'user-b',
  createdAt: 0,
  startedAt: 0,
  completedAt: 0,
  sessionJson: null,
  turnIndex: null,
  activePlayerId: null,
  pendingFinalization: false,
  resultPayloadJson: null,
  cancelProposalUserId: null,
  asyncStartedAt: null,
  dartsOwnerUserId: null,
  asyncStateJson: null,
  version: 1,
  ...overrides,
})

describe('onlinePlay helpers', () => {
  it('parses play-state envelopes from sessionJson', () => {
    const session = sampleSession()
    const snapshot = parseOnlinePlaySnapshot(
      JSON.stringify({ session, turnIndex: 1, pendingFinalization: true }),
    )

    expect(snapshot.turnIndex).toBe(1)
    expect(snapshot.pendingFinalization).toBe(true)
    expect(snapshot.session.id).toBe('match-1')
  })

  it('marks the viewer as human and the opponent as remote', () => {
    const decorated = decorateOnlineSessionForViewer(sampleSession(), 'user-a', 'Timon')

    expect(decorated.players[0]).toEqual({
      id: 'user-a',
      name: 'Timon',
      kind: PlayerKind.Human,
    })
    expect(decorated.players[1]).toEqual({
      id: 'user-b',
      name: 'Opponent',
      kind: PlayerKind.Remote,
    })
  })

  it('uses the provided opponent display name when decorating', () => {
    const decorated = decorateOnlineSessionForViewer(sampleSession(), 'user-b', 'Timon', 'Alex')

    expect(decorated.players[0]?.name).toBe('Alex')
    expect(decorated.players[1]?.name).toBe('Timon')
    expect(decorated.players[1]?.kind).toBe(PlayerKind.Human)
  })

  it('prefers result_payload.session for the completed match dialog', () => {
    const frozen = sampleSession({
      visits: [
        {
          visitIndex: 0,
          playerId: 'user-a',
          darts: [],
          visitScore: 180,
          scoreBefore: 501,
          scoreAfter: 321,
          bust: false,
          checkout: false,
        },
      ],
    })
    const reconstructed = sampleSession({
      status: GameStatus.Completed,
      completedAt: '2026-01-01T00:20:00.000Z',
      visits: [
        ...frozen.visits,
        {
          visitIndex: 1,
          playerId: 'user-a',
          darts: [],
          visitScore: 0,
          scoreBefore: 141,
          scoreAfter: 141,
          bust: false,
          checkout: false,
        },
        {
          visitIndex: 2,
          playerId: 'user-b',
          darts: [],
          visitScore: 141,
          scoreBefore: 141,
          scoreAfter: 0,
          bust: false,
          checkout: true,
        },
      ],
      matchProgress: {
        legsToWin: 1,
        startingPlayerIndex: 0,
        currentLeg: 1,
        legWins: { 'user-a': 0, 'user-b': 1 },
      },
    })

    const session = resolveCompletedOnlineSession(
      sampleMatchState({
        resultPayloadJson: JSON.stringify({
          session: reconstructed,
          winnerUserId: 'user-b',
        }),
      }),
      frozen,
      'user-a',
      'test',
      'tess',
    )

    expect(session.visits).toHaveLength(3)
    expect(session.visits.at(-1)).toMatchObject({
      playerId: 'user-b',
      visitScore: 141,
      checkout: true,
    })
    expect(session.matchProgress?.legWins).toEqual({ 'user-a': 0, 'user-b': 1 })
    expect(session.players[0]?.name).toBe('test')
    expect(session.players[1]?.name).toBe('tess')
  })

  it('falls back to the live session when result_payload has no session', () => {
    const frozen = sampleSession({
      visits: [
        {
          visitIndex: 0,
          playerId: 'user-a',
          darts: [],
          visitScore: 180,
          scoreBefore: 501,
          scoreAfter: 321,
          bust: false,
          checkout: false,
        },
      ],
    })

    const session = resolveCompletedOnlineSession(
      sampleMatchState({ resultPayloadJson: null }),
      frozen,
      'user-a',
      'test',
    )

    expect(session.visits).toHaveLength(1)
    expect(session.players[0]?.name).toBe('test')
  })

  it('serializes darts for record_visit payloads', () => {
    expect(
      toPublicDartThrow({
        segment: { type: DartSegmentType.Number, value: 20 },
        multiplier: DartMultiplier.Triple,
        points: 60,
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      segment: { type: 'number', value: 20 },
      multiplier: 'triple',
      points: 60,
      timestamp: '2026-01-01T00:00:00.000Z',
    })
  })
})
