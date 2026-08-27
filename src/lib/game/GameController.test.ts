import { describe, expect, it } from 'vitest'
import { ChallengeLegEndMode } from '../../types/match'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { createGameController } from './createSession'
import { createChallengeConfig } from './challenge'
import { createPlayer, createSoloHumanPlayer } from './playerFactory'
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

  it('completes the session when the last life is lost in 121', () => {
    const failedVisit = [
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
    ]

    let controller = createGameController({
      mode: GameModeId.OneTwentyOne,
      config: {
        startScore: 121,
        increment: 1,
        startingLives: 1,
        maxVisitsPerTarget: 3,
        doubleOut: true,
      },
      players: [soloPlayer],
    })

    for (let visit = 0; visit < 3; visit += 1) {
      controller = failedVisit.reduce((current, dart) => current.recordDart(dart), controller)
    }

    expect(controller.isComplete).toBe(true)
    expect(controller.session.finishedEarly).toBeUndefined()
    expect(controller.session.status).toBe(GameStatus.Completed)
  })
})

describe('GameController challenge mode', () => {
  const recordVisit = (
    controller: ReturnType<typeof createGameController>,
    darts: ReturnType<typeof numberDart>[],
  ) => darts.reduce((current, dart) => current.recordDart(dart), controller)

  const checkoutDart = (scoreBefore: number) => numberDart(scoreBefore / 2, DartMultiplier.Double)

  it('records a leg win when checkout is within the visit limit', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: {
        legsToWin: 2,
        startingPlayerIndex: 0,
        challenge: createChallengeConfig(2, ChallengeLegEndMode.PlayToCheckout, 40),
      },
    })

    controller = controller.recordDart(checkoutDart(40))

    expect(controller.session.matchProgress?.legWins[human.id]).toBe(1)
    expect(controller.session.matchProgress?.legLosses).toBe(0)
  })

  it('records a leg loss when checkout exceeds the visit limit in play-to-checkout mode', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: {
        legsToWin: 3,
        startingPlayerIndex: 0,
        challenge: createChallengeConfig(2, ChallengeLegEndMode.PlayToCheckout, 40),
      },
    })

    controller = recordVisit(controller, [
      numberDart(5, DartMultiplier.Single),
      numberDart(5, DartMultiplier.Single),
      numberDart(5, DartMultiplier.Single),
    ])
    controller = recordVisit(controller, [
      numberDart(5, DartMultiplier.Single),
      numberDart(5, DartMultiplier.Single),
      numberDart(5, DartMultiplier.Single),
    ])
    controller = controller.recordDart(numberDart(5, DartMultiplier.Double))

    expect(controller.session.matchProgress?.legWins[human.id]).toBe(0)
    expect(controller.session.matchProgress?.legLosses).toBe(1)
    expect(controller.session.matchProgress?.currentLeg).toBe(2)
  })

  it('ends the leg immediately when stop-at-limit is reached', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: {
        legsToWin: 3,
        startingPlayerIndex: 0,
        challenge: createChallengeConfig(3, ChallengeLegEndMode.StopAtLimit, 501),
      },
    })

    controller = recordVisit(controller, [
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
    ])
    controller = recordVisit(controller, [
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
    ])
    controller = recordVisit(controller, [
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
    ])

    expect(controller.session.matchProgress?.legLosses).toBe(1)
    expect(controller.session.matchProgress?.currentLeg).toBe(2)
    expect(controller.isComplete).toBe(false)
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(501)
  })

  it('completes the match after enough challenge wins', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: {
        legsToWin: 2,
        startingPlayerIndex: 0,
        challenge: createChallengeConfig(1, ChallengeLegEndMode.PlayToCheckout, 40),
      },
    })

    controller = controller.recordDart(checkoutDart(40))
    controller = controller.recordDart(checkoutDart(40))

    expect(controller.isComplete).toBe(true)
    expect(controller.session.matchProgress?.legWins[human.id]).toBe(2)
  })
})

describe('GameController multi-leg checkout undo', () => {
  const playerOne = createPlayer('One', PlayerKind.Human, 'p1')
  const playerTwo = createPlayer('Two', PlayerKind.Human, 'p2')
  const shortLegConfig = { startScore: 100, doubleIn: false, doubleOut: true }

  const recordVisit = (
    controller: ReturnType<typeof createGameController>,
    darts: ReturnType<typeof numberDart>[],
  ) => darts.reduce((current, dart) => current.recordDart(dart), controller)

  const scoreSixtyVisit = [
    numberDart(20, DartMultiplier.Single),
    numberDart(20, DartMultiplier.Single),
    numberDart(20, DartMultiplier.Single),
  ]

  const checkoutFromForty = numberDart(20, DartMultiplier.Double)

  const playLegOneToCheckout = (controller: ReturnType<typeof createGameController>) =>
    recordVisit(recordVisit(recordVisit(controller, scoreSixtyVisit), scoreSixtyVisit), [
      checkoutFromForty,
    ])

  it('undoes a leg-winning checkout and restores the previous leg score', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: shortLegConfig,
      players: [playerOne, playerTwo],
      matchFormat: { legsToWin: 3, startingPlayerIndex: 0 },
    })

    controller = playLegOneToCheckout(controller)

    expect(controller.session.matchProgress?.currentLeg).toBe(2)
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(100)

    const undone = controller.undoDart()

    expect(undone.session.matchProgress?.currentLeg).toBe(1)
    expect(undone.session.matchProgress?.legWins[playerOne.id]).toBe(0)
    expect(undone.isComplete).toBe(false)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(40)
    expect(undone.scoreboard.players[1]?.primaryScore).toBe(40)
  })

  it('undoes a match-winning checkout without reverting to the previous leg', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: shortLegConfig,
      players: [playerOne, playerTwo],
      matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
    })

    controller = playLegOneToCheckout(controller)
    controller = recordVisit(controller, [
      numberDart(1, DartMultiplier.Single),
      numberDart(1, DartMultiplier.Single),
      numberDart(1, DartMultiplier.Single),
    ])
    controller = recordVisit(controller, scoreSixtyVisit)
    controller = recordVisit(controller, [
      numberDart(1, DartMultiplier.Single),
      numberDart(1, DartMultiplier.Single),
      numberDart(1, DartMultiplier.Single),
    ])
    controller = controller.recordDart(checkoutFromForty)

    expect(controller.isComplete).toBe(true)
    expect(controller.session.matchProgress?.currentLeg).toBe(2)
    expect(controller.session.matchProgress?.legWins[playerOne.id]).toBe(2)

    const undone = controller.undoDart()

    expect(undone.isComplete).toBe(false)
    expect(undone.session.status).toBe(GameStatus.InProgress)
    expect(undone.session.matchProgress?.currentLeg).toBe(2)
    expect(undone.session.matchProgress?.legWins[playerOne.id]).toBe(1)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(40)
    expect(undone.scoreboard.players[1]?.primaryScore).toBe(94)
  })

  it('undoes a leg-winning checkout after undoing partial next-leg play', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: shortLegConfig,
      players: [playerOne, playerTwo],
      matchFormat: { legsToWin: 3, startingPlayerIndex: 0 },
    })

    controller = playLegOneToCheckout(controller)
    controller = recordVisit(controller, scoreSixtyVisit)

    expect(controller.session.matchProgress?.currentLeg).toBe(2)
    expect(controller.session.visits.at(-1)?.legIndex).toBe(2)

    controller = controller.undoDart().undoDart().undoDart()
    controller = controller.undoDart()

    expect(controller.session.matchProgress?.currentLeg).toBe(1)
    expect(controller.session.matchProgress?.legWins[playerOne.id]).toBe(0)
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(40)
    expect(controller.scoreboard.players[1]?.primaryScore).toBe(40)
  })
})

describe('GameController visit-score input', () => {
  const soloPlayer = createPlayer('Solo', PlayerKind.Human, 'solo')

  it('commits a visit score immediately', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    const next = controller.recordVisitScore(100)

    expect(next.pendingDarts).toHaveLength(0)
    expect(next.session.visits).toHaveLength(1)
    expect(next.session.visits[0]).toMatchObject({
      visitScore: 100,
      scoreAfter: 401,
      inputMode: 'visit-score',
      darts: [],
    })
    expect(next.scoreboard.players[0]?.primaryScore).toBe(401)
  })

  it('rejects visit scores while pending darts exist', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    }).recordDart(numberDart(20, DartMultiplier.Single))

    const next = controller.recordVisitScore(60)

    expect(next.session.visits).toHaveLength(0)
    expect(next.pendingDarts).toHaveLength(1)
  })

  it('rejects out-of-range visit scores', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })

    expect(controller.recordVisitScore(181).session.visits).toHaveLength(0)
    expect(controller.recordVisitScore(-1).session.visits).toHaveLength(0)
  })

  it('auto-busts when the visit score exceeds remaining', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [soloPlayer],
    })

    const next = controller.recordVisitScore(60)

    expect(next.session.visits[0]?.bust).toBe(true)
    expect(next.session.visits[0]?.visitScore).toBe(0)
    expect(next.scoreboard.players[0]?.primaryScore).toBe(40)
  })

  it('undoes a visit-score visit as a whole', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [soloPlayer],
    })
      .recordVisitScore(100)
      .undoDart()

    expect(controller.session.visits).toHaveLength(0)
    expect(controller.pendingDarts).toHaveLength(0)
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(501)
  })

  it('rebuilds engine state after undo of a busted visit score', () => {
    const afterBust = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 50, doubleIn: false, doubleOut: true },
      players: [soloPlayer],
    }).recordVisitScore(60)

    expect(afterBust.session.visits[0]?.bust).toBe(true)

    const afterAnother = afterBust.recordVisitScore(10)
    expect(afterAnother.scoreboard.players[0]?.primaryScore).toBe(40)

    const undone = afterAnother.undoDart()
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(50)
    expect(undone.session.visits).toHaveLength(1)
  })

  it('records visit scores for 121', () => {
    const controller = createGameController({
      mode: GameModeId.OneTwentyOne,
      players: [soloPlayer],
    }).recordVisitScore(60)

    expect(controller.session.visits[0]?.visitScore).toBe(60)
    expect(controller.session.visits[0]?.inputMode).toBe('visit-score')
  })

  it('records visit scores for 10-up-1-down', () => {
    const controller = createGameController({
      mode: GameModeId.TenUpOneDown,
      players: [soloPlayer],
    }).recordVisitScore(40)

    expect(controller.session.visits[0]?.inputMode).toBe('visit-score')
  })
})
