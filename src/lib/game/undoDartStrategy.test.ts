import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { createGameController } from './createSession'
import { numberDart } from '../testHelpers'
import { createBotPlayer, createSoloHumanPlayer } from './playerFactory'

describe('undoDartStrategy', () => {
  const recordVisit = (
    controller: ReturnType<typeof createGameController>,
    darts: ReturnType<typeof numberDart>[],
  ) => darts.reduce((current, dart) => current.recordDart(dart), controller)

  it('undoes the primary human dart even after the bot has thrown', () => {
    const human = createSoloHumanPlayer()
    const bot = createBotPlayer(5)
    let controller = createGameController({
      mode: GameModeId.X01,
      players: [human, bot],
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

    expect(controller.activePlayerId).toBe(human.id)
    expect(controller.session.visits).toHaveLength(2)

    const undone = controller.undoDart()

    expect(undone.activePlayerId).toBe(human.id)
    expect(undone.session.visits).toHaveLength(0)
    expect(undone.pendingDarts).toHaveLength(2)
    expect(undone.scoreboard.players[0]?.primaryScore).toBe(461)
    expect(undone.scoreboard.players[1]?.primaryScore).toBe(501)
  })

  it('undoes a pending human dart on the human turn', () => {
    const human = createSoloHumanPlayer()
    const bot = createBotPlayer(5)
    let controller = createGameController({
      mode: GameModeId.X01,
      players: [human, bot],
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
    controller = controller.recordDart(numberDart(20, DartMultiplier.Single))

    expect(controller.activePlayerId).toBe(human.id)
    expect(controller.pendingDarts).toHaveLength(1)

    const undone = controller.undoDart()

    expect(undone.activePlayerId).toBe(human.id)
    expect(undone.pendingDarts).toHaveLength(0)
    expect(undone.session.visits).toHaveLength(2)
  })
})
