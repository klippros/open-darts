import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { PlayerKind } from '@open-darts/game/types/player'
import { DartMultiplier } from '@open-darts/game/types/dart'
import { numberDart } from '@open-darts/game/testHelpers'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import { NinetyNineDartsTargetKind } from '@open-darts/game/types/ninetyNineDarts'
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
    expect(stats.fiveOhOne?.legsPlayed).toBe(1)
    expect(stats.fiveOhOne?.legWinRate).toBe(100)
    expect(stats.fiveOhOne?.dartsThrown).toBe(6)
    expect(stats.fiveOhOne?.bestLegDarts).toBe(6)
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

  it('uses independent active windows and mode-specific practice aggregation', () => {
    const ninetyNineAtTwenty = sampleSession({
      id: '99-at-20',
      mode: GameModeId.NinetyNineDarts,
      config: {
        target: { kind: NinetyNineDartsTargetKind.Number, value: 20 },
      },
      completedAt: '2026-05-05T00:00:00.000Z',
      visits: [
        sampleVisit({
          visitScore: 9,
          scoreBefore: 0,
          scoreAfter: 9,
        }),
      ],
    })
    const ninetyNineBull = sampleSession({
      id: '99-bull',
      mode: GameModeId.NinetyNineDarts,
      config: { target: { kind: NinetyNineDartsTargetKind.Bull } },
      completedAt: '2026-05-31T00:00:00.000Z',
      visits: [sampleVisit({ visitScore: 6, scoreBefore: 0, scoreAfter: 6 })],
    })
    const newerBob = sampleSession({
      id: 'newer-bob',
      mode: GameModeId.Bob27,
      config: { startScore: 27 },
      completedAt: '2026-07-15T00:00:00.000Z',
      visits: [sampleVisit({ visitScore: 40, scoreBefore: 27, scoreAfter: 67 })],
    })
    const aroundSingles = sampleSession({
      id: 'atc-singles',
      mode: GameModeId.AroundTheClock,
      config: { finishOnBull: false, aimMode: AroundTheClockAimMode.Singles },
      completedAt: '2026-06-01T00:00:00.000Z',
      visits: [sampleVisit({ visitScore: 1, scoreBefore: 0, scoreAfter: 1, checkout: true })],
    })
    const aroundAny = sampleSession({
      id: 'atc-any',
      mode: GameModeId.AroundTheClock,
      config: { finishOnBull: false, aimMode: AroundTheClockAimMode.Any },
      completedAt: '2026-06-15T00:00:00.000Z',
      visits: [sampleVisit({ visitScore: 2, scoreBefore: 0, scoreAfter: 1, checkout: true })],
    })

    const stats = buildProfileStats({
      displayName: 'Alex',
      profileUserId: 'user-a',
      onlineSessions: [],
      practiceSessions: [ninetyNineAtTwenty, ninetyNineBull, newerBob, aroundSingles, aroundAny],
    })

    expect(stats.ninetyNineDarts?.sessionsPlayed).toBe(2)
    expect(stats.ninetyNineDarts?.avgFinalScore).toBe(9)
    expect(stats.ninetyNineDarts?.avgTreblesPerGame).toBe(3)
    expect(stats.ninetyNineDarts?.window.endAt).toBe('2026-05-31T00:00:00.000Z')
    expect(stats.bob27?.window.endAt).toBe('2026-07-15T00:00:00.000Z')
    expect(stats.aroundTheClock?.sessionsPlayed).toBe(2)
    expect(stats.aroundTheClock?.window.endAt).toBe('2026-06-15T00:00:00.000Z')
  })
})
