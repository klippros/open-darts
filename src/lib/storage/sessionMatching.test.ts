import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import {
  buildGamePathFromSession,
  configsMatch,
  sessionMatchesLaunchParams,
} from './sessionMatching'

describe('sessionMatching', () => {
  it('matches x01 sessions by config', () => {
    const session: GameSession = {
      id: 'session-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
      visits: [],
      status: GameStatus.InProgress,
      startedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(
      sessionMatchesLaunchParams(session, {
        mode: GameModeId.X01,
        config: { startScore: 501, doubleIn: false, doubleOut: true },
        players: session.players,
      }),
    ).toBe(true)

    expect(
      sessionMatchesLaunchParams(session, {
        mode: GameModeId.X01,
        config: { startScore: 301, doubleIn: false, doubleOut: true },
        players: session.players,
      }),
    ).toBe(false)
  })

  it('matches in-progress sessions for a logged-in primary human name', () => {
    const human = { id: 'player-1', name: 'Alex', kind: PlayerKind.Human }
    const bot = { id: 'player-2', name: 'Dart Bot (Level 5)', kind: PlayerKind.Bot, botLevel: 5 }
    const session: GameSession = {
      id: 'session-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [human, bot],
      visits: [
        {
          visitIndex: 0,
          playerId: human.id,
          darts: [],
          visitScore: 60,
          scoreBefore: 501,
          scoreAfter: 441,
          bust: false,
          checkout: false,
        },
      ],
      status: GameStatus.InProgress,
      startedAt: '2026-01-01T00:00:00.000Z',
      matchProgress: {
        legsToWin: 2,
        startingPlayerIndex: 0,
        currentLeg: 1,
        legWins: { [human.id]: 0, [bot.id]: 0 },
      },
    }

    expect(
      sessionMatchesLaunchParams(session, {
        mode: GameModeId.X01,
        config: session.config,
        players: [human, bot],
        matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
      }),
    ).toBe(true)
  })

  it('builds preset and custom x01 paths', () => {
    expect(
      buildGamePathFromSession({
        id: 'session-1',
        mode: GameModeId.X01,
        config: { startScore: 501, doubleIn: false, doubleOut: true },
        players: [],
        visits: [],
        status: GameStatus.InProgress,
        startedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('/game?preset=501')

    expect(
      buildGamePathFromSession({
        id: 'session-1',
        mode: GameModeId.X01,
        config: { startScore: 333, doubleIn: true, doubleOut: false },
        players: [],
        visits: [],
        status: GameStatus.InProgress,
        startedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('/game?start=333&doubleIn=1&doubleOut=0')
  })

  it('compares practice mode configs', () => {
    expect(configsMatch(GameModeId.Bob27, { startScore: 27 }, { startScore: 27 })).toBe(true)
  })
})
