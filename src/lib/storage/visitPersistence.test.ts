import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { createGameController, restoreGameController } from '../game/createSession'
import { numberDart } from '../testHelpers'
import { DartMultiplier } from '../../types/dart'
import {
  buildGamePathFromSession,
  configsMatch,
  sessionMatchesLaunchParams,
} from './sessionMatching'
import {
  createControllerSnapshot,
  finalizeCompletedSession,
  getResumableSnapshot,
  persistControllerState,
  saveControllerSnapshot,
} from './visitPersistence'
import {
  clearActiveSnapshot,
  loadActiveSnapshot,
  loadStoredSessions,
  saveActiveSnapshot,
} from './gameStore'

const createLocalStorageMock = () => {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock())
})

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

describe('visitPersistence', () => {
  it('persists in-progress controllers to active storage', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
    })

    const withDart = controller.recordDart(numberDart(20, DartMultiplier.Triple))
    persistControllerState(withDart)

    const active = loadActiveSnapshot()
    expect(active?.session.visits).toHaveLength(0)
    expect(active?.pendingDarts).toHaveLength(1)
  })

  it('archives completed sessions and clears active storage', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
    })

    saveControllerSnapshot(controller)

    controller = controller.withSession(
      {
        ...controller.session,
        status: GameStatus.Completed,
        completedAt: '2026-01-01T00:00:00.000Z',
      },
      controller.engineState,
      controller.turnIndex,
    )

    finalizeCompletedSession(controller)

    expect(loadStoredSessions()).toHaveLength(1)
    expect(loadActiveSnapshot()).toBeNull()
  })

  it('removes archived sessions when a completed game is undone', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
    })

    controller = controller.withSession(
      {
        ...controller.session,
        status: GameStatus.Completed,
        completedAt: '2026-01-01T00:00:00.000Z',
        visits: [
          {
            visitIndex: 0,
            playerId: 'player-1',
            darts: [numberDart(25, DartMultiplier.Double), numberDart(25, DartMultiplier.Double)],
            visitScore: 100,
            scoreBefore: 100,
            scoreAfter: 0,
            bust: false,
            checkout: true,
          },
        ],
      },
      controller.engineState,
      controller.turnIndex,
    )

    finalizeCompletedSession(controller)
    expect(loadStoredSessions()).toHaveLength(1)

    controller = controller.undoDart()
    persistControllerState(controller)

    expect(loadStoredSessions()).toHaveLength(0)
    expect(getResumableSnapshot()).not.toBeNull()
  })

  it('returns only in-progress snapshots for resume', () => {
    saveControllerSnapshot(
      createGameController({
        mode: GameModeId.Bob27,
        players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
      }),
    )

    expect(getResumableSnapshot()).not.toBeNull()

    clearActiveSnapshot()
    saveActiveSnapshot({
      session: {
        id: 'session-1',
        mode: GameModeId.Bob27,
        config: { startScore: 27 },
        players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
        visits: [],
        status: GameStatus.Completed,
        startedAt: '2026-01-01T00:00:00.000Z',
      },
      turnIndex: 0,
      pendingDarts: [],
      savedAt: '2026-01-01T00:00:00.000Z',
    })

    expect(getResumableSnapshot()).toBeNull()
  })
})

describe('restoreGameController', () => {
  it('restores pending darts and committed visits', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
    })

    controller = controller
      .recordDart(numberDart(20, DartMultiplier.Triple))
      .recordDart(numberDart(20, DartMultiplier.Triple))
      .recordDart(numberDart(20, DartMultiplier.Triple))
      .recordDart(numberDart(19, DartMultiplier.Single))

    const snapshot = createControllerSnapshot(controller)
    const restored = restoreGameController(snapshot)

    expect(restored.session.visits).toHaveLength(1)
    expect(restored.pendingDarts).toHaveLength(1)
    expect(restored.scoreboard.players[0]?.primaryScore).toBe(
      controller.scoreboard.players[0]?.primaryScore,
    )
  })
})
