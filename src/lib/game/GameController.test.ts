import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { createGameController } from './createSession'
import { createPlayer } from './playerFactory'
import { numberDart } from '../testHelpers'

describe('GameController', () => {
  const soloPlayer = createPlayer('Solo', PlayerKind.Human, 'solo')

  it('buffers darts until three are thrown', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    const afterOne = controller.recordDart(numberDart(20, DartMultiplier.Single))
    const afterTwo = afterOne.recordDart(numberDart(20, DartMultiplier.Single))

    expect(afterTwo.pendingDarts).toHaveLength(2)
    expect(afterTwo.session.visits).toHaveLength(0)
    expect(afterTwo.scoreboard.players[0]?.primaryScore).toBe(461)
  })

  it('commits a visit after three darts', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    const next = controller
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))

    expect(next.pendingDarts).toHaveLength(0)
    expect(next.session.visits).toHaveLength(1)
    expect(next.session.visits[0]?.scoreAfter).toBe(441)
  })

  it('commits early on checkout', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [soloPlayer],
    })

    const next = controller.recordDart(numberDart(20, DartMultiplier.Double))

    expect(next.session.visits).toHaveLength(1)
    expect(next.session.visits[0]?.checkout).toBe(true)
    expect(next.isComplete).toBe(true)
    expect(next.session.status).toBe(GameStatus.Completed)
  })

  it('undoes the last pending dart', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    const withTwo = controller
      .recordDart(numberDart(20, DartMultiplier.Triple))
      .recordDart(numberDart(20, DartMultiplier.Triple))
    const undone = withTwo.undoDart()

    expect(undone.pendingDarts).toHaveLength(1)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(441)
  })

  it('undoes the last dart from a committed visit', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    const afterVisit = controller
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
    const undone = afterVisit.undoDart()

    expect(undone.session.visits).toHaveLength(0)
    expect(undone.pendingDarts).toHaveLength(2)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(461)
  })

  it('undoes a checkout and resumes the match', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [soloPlayer],
    })

    const finished = controller.recordDart(numberDart(20, DartMultiplier.Double))
    const undone = finished.undoDart()

    expect(undone.isComplete).toBe(false)
    expect(undone.session.status).toBe(GameStatus.InProgress)
    expect(undone.session.visits).toHaveLength(0)
    expect(undone.pendingDarts).toHaveLength(0)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(40)
  })

  it('undoes across player turns', () => {
    const playerOne = createPlayer('One', PlayerKind.Human, 'p1')
    const playerTwo = createPlayer('Two', PlayerKind.Human, 'p2')
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [playerOne, playerTwo],
    })

    const afterPlayerTwoVisit = controller
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))

    expect(afterPlayerTwoVisit.activePlayerId).toBe(playerOne.id)

    const undone = afterPlayerTwoVisit.undoDart()

    expect(undone.activePlayerId).toBe(playerTwo.id)
    expect(undone.session.visits).toHaveLength(1)
    expect(undone.pendingDarts).toHaveLength(2)
    expect(undone.scoreboard.players[1]?.primaryScore).toBe(461)
  })

  it('rotates turns between players', () => {
    const playerOne = createPlayer('One', PlayerKind.Human, 'p1')
    const playerTwo = createPlayer('Two', PlayerKind.Human, 'p2')
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [playerOne, playerTwo],
    })

    const afterVisit = controller
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))

    expect(afterVisit.activePlayerId).toBe(playerTwo.id)
    expect(afterVisit.scoreboard.players[1]?.isActive).toBe(true)
  })

  it('ignores darts after the game is complete', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [soloPlayer],
    })

    const finished = controller.recordDart(numberDart(20, DartMultiplier.Double))
    const ignored = finished.recordDart(numberDart(20, DartMultiplier.Single))

    expect(ignored).toBe(finished)
    expect(ignored.session.visits).toHaveLength(1)
  })

  it('finishes an in-progress match early and opens the summary flow', () => {
    const controller = createGameController({
      mode: GameModeId.TenUpOneDown,
      players: [soloPlayer],
    })

    const inProgress = controller
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))
      .recordDart(numberDart(20, DartMultiplier.Single))

    const finished = inProgress.finishMatch()

    expect(finished.isComplete).toBe(true)
    expect(finished.session.status).toBe(GameStatus.Completed)
    expect(finished.session.finishedEarly).toBe(true)
    expect(finished.session.completedAt).toBeTypeOf('string')
    expect(finished.session.visits).toHaveLength(1)
  })

  it('commits pending darts before finishing early', () => {
    const controller = createGameController({
      mode: GameModeId.OneTwentyOne,
      players: [soloPlayer],
    })

    const withPending = controller.recordDart(numberDart(20, DartMultiplier.Single))
    const finished = withPending.finishMatch()

    expect(finished.session.visits).toHaveLength(1)
    expect(finished.pendingDarts).toHaveLength(0)
    expect(finished.isComplete).toBe(true)
  })
})
