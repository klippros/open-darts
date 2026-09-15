import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { MatchEndingKind, MatchStatus, PlayMode } from '../matchServer/types'
import type { OnlineMatchHistoryRow } from '../matchServer/types'
import {
  getOnlineMatchEndingLabel,
  getOnlineMatchModeLabel,
  getOnlineMatchResultSummary,
  getOnlineMatchSummaryTitle,
  readOnlineMatchHistorySession,
} from './onlineHistorySummary'

const sampleMatch = (overrides: Partial<OnlineMatchHistoryRow> = {}): OnlineMatchHistoryRow => ({
  id: 'match-1',
  status: MatchStatus.Completed,
  playMode: PlayMode.Synchronous,
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  legsToWin: 3,
  endingKind: MatchEndingKind.Checkout,
  winnerUserId: 'viewer',
  creatorUserId: 'viewer',
  completedAt: '2026-09-08T12:00:00.000Z',
  createdAt: '2026-09-08T11:00:00.000Z',
  opponentUserId: 'opponent',
  session: null,
  ...overrides,
})

describe('onlineHistorySummary', () => {
  it('labels X01 matches by start score', () => {
    expect(getOnlineMatchModeLabel(sampleMatch())).toBe('501')
  })

  it('labels ending kinds for history display', () => {
    expect(getOnlineMatchEndingLabel(MatchEndingKind.Checkout)).toBe('Checkout')
    expect(getOnlineMatchEndingLabel(MatchEndingKind.Abandon)).toBe('Abandon')
    expect(getOnlineMatchEndingLabel(MatchEndingKind.AsyncTimeout)).toBe('Async timeout')
    expect(getOnlineMatchEndingLabel(MatchEndingKind.MutualCancel)).toBe('Mutual cancel')
    expect(getOnlineMatchEndingLabel(MatchEndingKind.AsyncResult)).toBe('Async result')
  })

  it('summarizes wins, losses, and mutual cancels for the viewer', () => {
    expect(getOnlineMatchResultSummary(sampleMatch(), 'viewer', 'Alex')).toBe(
      'Won vs Alex · Checkout · 3 legs',
    )
    expect(
      getOnlineMatchResultSummary(
        sampleMatch({ winnerUserId: 'opponent', endingKind: MatchEndingKind.Abandon }),
        'viewer',
        'Alex',
      ),
    ).toBe('Lost vs Alex · Abandon · 3 legs')
    expect(
      getOnlineMatchResultSummary(
        sampleMatch({
          status: MatchStatus.Cancelled,
          endingKind: MatchEndingKind.MutualCancel,
          winnerUserId: null,
        }),
        'viewer',
        'Alex',
      ),
    ).toBe('Draw vs Alex · Mutual cancel · 3 legs')
  })

  it('titles online match summaries for the viewer', () => {
    expect(getOnlineMatchSummaryTitle(sampleMatch(), 'viewer')).toBe('Match won!')
    expect(getOnlineMatchSummaryTitle(sampleMatch({ winnerUserId: 'opponent' }), 'viewer')).toBe(
      'Match lost',
    )
    expect(
      getOnlineMatchSummaryTitle(
        sampleMatch({
          endingKind: MatchEndingKind.MutualCancel,
          winnerUserId: null,
        }),
        'viewer',
      ),
    ).toBe('Draw')
  })

  it('reads a stored game session from result_payload', () => {
    const session = {
      id: 'session-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [],
      visits: [],
      status: GameStatus.Completed,
      startedAt: '2026-09-08T11:00:00.000Z',
    }

    expect(readOnlineMatchHistorySession({ session, winnerUserId: 'viewer' })).toEqual(session)
    expect(
      readOnlineMatchHistorySession(JSON.stringify({ session, winnerUserId: 'viewer' })),
    ).toEqual(session)
    expect(readOnlineMatchHistorySession({ asyncPlay: {}, visits: [] })).toBeNull()
    expect(readOnlineMatchHistorySession(null)).toBeNull()
  })
})
