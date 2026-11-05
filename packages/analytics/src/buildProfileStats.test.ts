import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { PlayerKind } from '@open-darts/game/types/player'
import { DartMultiplier } from '@open-darts/game/types/dart'
import { numberDart } from '@open-darts/game/testHelpers'
import { buildProfileStats, orientSessionForProfileUser } from './buildProfileStats'

const sampleVisit = (
  overrides: Partial<GameSession['visits'][number]> = {},
): GameSession['visits'][number] => ({
  visitIndex: 0,
  playerId: 'user-a',
  darts: [
    numberDart(20, DartMultiplier.Triple),
    numberDart(20, DartMultiplier.Triple),
    numberDart(20, DartMultiplier.Triple),
  ],
  visitScore: 180,
  scoreBefore: 501,
  scoreAfter: 321,
  bust: false,
  checkout: false,
  ...overrides,
})

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'user-a', name: 'A', kind: PlayerKind.Human }],
  visits: [sampleVisit()],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-03-01T00:00:00.000Z',
  ...overrides,
})

describe('orientSessionForProfileUser', () => {
  it('marks the profile user as the human primary player', () => {
    const session = sampleSession({
      players: [
        { id: 'user-a', name: 'A', kind: PlayerKind.Remote },
        { id: 'user-b', name: 'B', kind: PlayerKind.Human },
      ],
    })

    const oriented = orientSessionForProfileUser(session, 'user-a')
    expect(oriented.players[0]?.kind).toBe(PlayerKind.Human)
    expect(oriented.players[1]?.kind).toBe(PlayerKind.Remote)
  })
})

describe('buildProfileStats', () => {
  it('returns numbers only and replaces highest visit with 180s', () => {
    const online = sampleSession({
      id: 'online-1',
      players: [
        { id: 'user-a', name: 'A', kind: PlayerKind.Human },
        { id: 'user-b', name: 'B', kind: PlayerKind.Remote },
      ],
      matchProgress: {
        legsToWin: 1,
        startingPlayerIndex: 0,
        currentLeg: 1,
        legWins: { 'user-a': 1, 'user-b': 0 },
      },
      visits: [
        sampleVisit({ legIndex: 1 }),
        sampleVisit({
          visitIndex: 1,
          playerId: 'user-b',
          visitScore: 60,
          scoreBefore: 501,
          scoreAfter: 441,
          darts: [numberDart(20, DartMultiplier.Single)],
          legIndex: 1,
        }),
        sampleVisit({
          visitIndex: 2,
          visitScore: 321,
          scoreBefore: 321,
          scoreAfter: 0,
          checkout: true,
          legIndex: 1,
          darts: [
            numberDart(20, DartMultiplier.Triple),
            numberDart(19, DartMultiplier.Triple),
            numberDart(12, DartMultiplier.Double),
          ],
        }),
      ],
    })

    const bobRecent = sampleSession({
      id: 'bob-1',
      mode: GameModeId.Bob27,
      config: { startScore: 27 },
      completedAt: '2026-04-01T00:00:00.000Z',
      visits: [
        sampleVisit({
          visitScore: 40,
          scoreBefore: 27,
          scoreAfter: 67,
          darts: [numberDart(20, DartMultiplier.Double)],
        }),
      ],
    })

    const bobOld = sampleSession({
      id: 'bob-old',
      mode: GameModeId.Bob27,
      config: { startScore: 27 },
      completedAt: '2025-01-01T00:00:00.000Z',
      visits: [sampleVisit({ visitScore: 10, scoreBefore: 27, scoreAfter: 37 })],
    })

    const stats = buildProfileStats({
      displayName: 'Alex',
      profileUserId: 'user-a',
      onlineSessions: [online],
      practiceSessions: [bobRecent, bobOld],
    })

    expect(stats.displayName).toBe('Alex')
    expect(stats.fiveOhOne).not.toBeNull()
    expect(stats.fiveOhOne?.thrown180).toBe(1)
    expect(stats.fiveOhOne?.highestVisit).toBeNull()
    expect(stats.fiveOhOne?.legsPlayed).toBeGreaterThan(0)
    expect(stats.bob27?.sessionsPlayed).toBe(1)
    expect(stats.aroundTheClock).toBeNull()
    expect(JSON.stringify(stats)).not.toMatch(/"visits"/u)
    expect(JSON.stringify(stats)).not.toMatch(/"payload"/u)
  })

  it('omits empty mode blocks', () => {
    const stats = buildProfileStats({
      displayName: 'Alex',
      profileUserId: 'user-a',
      onlineSessions: [],
      practiceSessions: [],
    })

    expect(stats.fiveOhOne).toBeNull()
    expect(stats.bob27).toBeNull()
    expect(stats.ninetyNineDarts).toBeNull()
    expect(stats.aroundTheClock).toBeNull()
  })
})
