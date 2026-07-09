import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { DartThrow } from '../../types/dart'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { x01Engine } from '../x01/x01Engine'
import { numberDart } from '../testHelpers'
import { GameController } from './GameController'
import { matchHasProgress } from './matchProgress'

const createTestController = (
  visits: GameSession['visits'] = [],
  pendingDarts: DartThrow[] = [],
) => {
  const session: GameSession = {
    id: 'test',
    mode: GameModeId.X01,
    config: { startScore: 501, doubleIn: false, doubleOut: true },
    players: [{ id: 'p1', name: 'Player 1', kind: PlayerKind.Human }],
    visits,
    status: GameStatus.InProgress,
    startedAt: '2026-01-01T00:00:00.000Z',
  }

  return new GameController(
    session,
    x01Engine,
    x01Engine.createInitialState(session.players, session.config),
    pendingDarts,
    0,
  )
}

describe('matchHasProgress', () => {
  it('is false before any dart is thrown', () => {
    expect(matchHasProgress(createTestController())).toBe(false)
  })

  it('is true when a dart is pending in the current visit', () => {
    const controller = createTestController([], [numberDart(20, DartMultiplier.Single)])
    expect(matchHasProgress(controller)).toBe(true)
  })

  it('is true when at least one visit is recorded', () => {
    const controller = createTestController([
      {
        visitIndex: 0,
        playerId: 'p1',
        darts: [numberDart(20, DartMultiplier.Single)],
        visitScore: 20,
        scoreBefore: 501,
        scoreAfter: 481,
        bust: false,
        checkout: false,
      },
    ])

    expect(matchHasProgress(controller)).toBe(true)
  })

  it('is false when the match is complete', () => {
    const controller = createTestController([
      {
        visitIndex: 0,
        playerId: 'p1',
        darts: [numberDart(20, DartMultiplier.Double)],
        visitScore: 40,
        scoreBefore: 40,
        scoreAfter: 0,
        bust: false,
        checkout: true,
      },
    ])

    const completed = new GameController(
      { ...controller.session, status: GameStatus.Completed },
      x01Engine,
      {
        ...x01Engine.createInitialState(controller.session.players, controller.session.config),
        winnerId: 'p1',
      },
      [],
      0,
    )

    expect(matchHasProgress(completed)).toBe(false)
  })
})
