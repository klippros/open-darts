import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import {
  formatSessionDate,
  getMatchSummary,
  getSessionModeLabel,
  getSessionResultSummary,
  sortSessionsByDate,
} from './sessionSummary'

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [
    {
      visitIndex: 0,
      playerId: 'player-1',
      darts: [],
      visitScore: 60,
      scoreBefore: 501,
      scoreAfter: 441,
      bust: false,
      checkout: false,
    },
    {
      visitIndex: 1,
      playerId: 'player-1',
      darts: [],
      visitScore: 40,
      scoreBefore: 441,
      scoreAfter: 401,
      bust: false,
      checkout: false,
    },
  ],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:15:00.000Z',
  ...overrides,
})

describe('sessionSummary', () => {
  it('labels x01 sessions by start score and other modes by definition label', () => {
    expect(getSessionModeLabel(sampleSession())).toBe('501')
    expect(
      getSessionModeLabel(
        sampleSession({
          mode: GameModeId.Bob27,
          config: { startScore: 27 },
        }),
      ),
    ).toBe("Bob's 27")
  })

  it('summarizes x01 sessions with visit count and average', () => {
    expect(getSessionResultSummary(sampleSession())).toBe('2 visits · 50.0 3-dart average')
  })

  it('builds match summaries for completed games', () => {
    expect(getMatchSummary(sampleSession())).toEqual({
      title: 'Session complete',
      details: ['2 visits', '50.0 3-dart average'],
    })
  })

  it('uses the checkout visit score before the winning visit', () => {
    expect(
      getMatchSummary(
        sampleSession({
          config: { startScore: 301, doubleIn: false, doubleOut: true },
          visits: [
            {
              visitIndex: 0,
              playerId: 'player-1',
              darts: [],
              visitScore: 100,
              scoreBefore: 301,
              scoreAfter: 201,
              bust: false,
              checkout: false,
            },
            {
              visitIndex: 1,
              playerId: 'player-1',
              darts: [],
              visitScore: 50,
              scoreBefore: 50,
              scoreAfter: 0,
              bust: false,
              checkout: true,
            },
          ],
        }),
      ),
    ).toEqual({
      title: 'Game shot!',
      details: ['2 visits', '75.0 3-dart average', 'Checked out from 50'],
    })
  })

  it('summarizes practice completion modes', () => {
    expect(
      getSessionResultSummary(
        sampleSession({
          mode: GameModeId.AroundTheClock,
          config: { finishOnBull: true },
          visits: [],
        }),
      ),
    ).toBe('0 visits · Hit every target through bull')
  })

  it('summarizes early finishes for open-ended practice modes', () => {
    expect(
      getMatchSummary(
        sampleSession({
          mode: GameModeId.TenUpOneDown,
          config: {
            startScore: 60,
            incrementUp: 10,
            decrementDown: 1,
            minScore: 2,
            doubleOut: true,
          },
          finishedEarly: true,
          visits: [
            {
              visitIndex: 0,
              playerId: 'player-1',
              darts: [],
              visitScore: 60,
              scoreBefore: 60,
              scoreAfter: 70,
              bust: false,
              checkout: false,
            },
          ],
        }),
      ),
    ).toEqual({
      title: '10 Up 1 Down session ended',
      details: ['1 visit', 'Stopped on 70'],
    })
  })

  it('sorts completed sessions newest first', () => {
    const older = sampleSession({
      id: 'older',
      completedAt: '2026-01-01T10:00:00.000Z',
    })
    const newer = sampleSession({
      id: 'newer',
      completedAt: '2026-01-02T10:00:00.000Z',
    })

    expect(sortSessionsByDate([older, newer])).toEqual([newer, older])
  })

  it('formats session dates for display', () => {
    expect(formatSessionDate('2026-01-01T10:15:00.000Z')).toMatch(/2026/u)
  })
})
