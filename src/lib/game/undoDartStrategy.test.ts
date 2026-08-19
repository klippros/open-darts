import { describe, expect, it } from 'vitest'
import { ChallengeLegEndMode } from '../../types/match'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { createGameController } from './createSession'
import { numberDart } from '../testHelpers'
import { createChallengeConfig } from './challenge'
import { createSoloHumanPlayer } from './playerFactory'

describe('undoDartStrategy', () => {
  const recordVisit = (
    controller: ReturnType<typeof createGameController>,
    darts: ReturnType<typeof numberDart>[],
  ) => darts.reduce((current, dart) => current.recordDart(dart), controller)

  it('undoes the last committed dart chronologically', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      players: [human],
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

    expect(controller.session.visits).toHaveLength(2)

    const undone = controller.undoDart()

    expect(undone.session.visits).toHaveLength(1)
    expect(undone.pendingDarts).toHaveLength(2)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(401)
  })

  it('undoes a pending dart', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      players: [human],
    })

    controller = controller.recordDart(numberDart(20, DartMultiplier.Single))

    expect(controller.pendingDarts).toHaveLength(1)

    const undone = controller.undoDart()

    expect(undone.pendingDarts).toHaveLength(0)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(501)
  })

  it('reverts challenge leg loss on undo', () => {
    const human = createSoloHumanPlayer()
    const challenge = createChallengeConfig(3, ChallengeLegEndMode.StopAtLimit, 501)
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: {
        legsToWin: 3,
        startingPlayerIndex: 0,
        challenge,
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

    const undone = controller.undoDart()

    expect(undone.session.matchProgress?.legLosses).toBe(0)
    expect(undone.session.matchProgress?.currentLeg).toBe(1)
  })
})
