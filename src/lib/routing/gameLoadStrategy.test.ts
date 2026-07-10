import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import type { CreateSessionParams } from '../game/createSession'
import { PlayerKind } from '../../types/player'
import { resolveGameLoadStrategy } from './gameLoadStrategy'

const human = { id: 'player-1', name: 'Alice', kind: PlayerKind.Human }
const bot = { id: 'player-2', name: 'Dart Bot (Level 5)', kind: PlayerKind.Bot, botLevel: 5 }

const x01LaunchParams: CreateSessionParams = {
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [human, bot],
  matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
}

const matchingSnapshot: ActiveGameSnapshot = {
  session: {
    id: 'session-1',
    mode: GameModeId.X01,
    config: { startScore: 501, doubleIn: false, doubleOut: true },
    players: [human, bot],
    visits: [],
    status: GameStatus.InProgress,
    startedAt: '2026-01-01T00:00:00.000Z',
    matchProgress: {
      legsToWin: 2,
      startingPlayerIndex: 0,
      currentLeg: 1,
      legWins: { [human.id]: 0, [bot.id]: 0 },
    },
  },
  turnIndex: 0,
  pendingDarts: [],
  savedAt: '2026-01-01T00:00:00.000Z',
}

describe('resolveGameLoadStrategy', () => {
  it('auto-restores when settings match and the user did not explicitly launch', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: false,
        explicitLaunch: false,
        savedSnapshot: matchingSnapshot,
        launchParams: x01LaunchParams,
      }),
    ).toEqual({ shouldRestoreOnLoad: true, shouldShowResumePrompt: false })
  })

  it('prompts to resume when settings match but the user explicitly launched', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: false,
        explicitLaunch: true,
        savedSnapshot: matchingSnapshot,
        launchParams: x01LaunchParams,
      }),
    ).toEqual({ shouldRestoreOnLoad: false, shouldShowResumePrompt: true })
  })

  it('prompts to resume when settings do not match', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: false,
        explicitLaunch: false,
        savedSnapshot: matchingSnapshot,
        launchParams: {
          ...x01LaunchParams,
          matchFormat: { legsToWin: 3, startingPlayerIndex: 0 },
        },
      }),
    ).toEqual({ shouldRestoreOnLoad: false, shouldShowResumePrompt: true })
  })

  it('starts fresh when the user chose to discard the saved game', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: true,
        explicitLaunch: true,
        savedSnapshot: matchingSnapshot,
        launchParams: x01LaunchParams,
      }),
    ).toEqual({ shouldRestoreOnLoad: false, shouldShowResumePrompt: false })
  })

  it('does not prompt when the saved snapshot is the active in-memory session', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: false,
        explicitLaunch: true,
        savedSnapshot: matchingSnapshot,
        launchParams: x01LaunchParams,
        activeSessionId: matchingSnapshot.session.id,
      }),
    ).toEqual({ shouldRestoreOnLoad: false, shouldShowResumePrompt: false })
  })

  it('still prompts on explicit launch when the saved snapshot belongs to another session', () => {
    expect(
      resolveGameLoadStrategy({
        startFresh: false,
        explicitLaunch: true,
        savedSnapshot: matchingSnapshot,
        launchParams: x01LaunchParams,
        activeSessionId: 'different-session-id',
      }),
    ).toEqual({ shouldRestoreOnLoad: false, shouldShowResumePrompt: true })
  })
})
