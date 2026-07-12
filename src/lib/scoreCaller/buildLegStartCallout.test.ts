import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { createGameController } from '../game/createSession'
import { createPlayer } from '../game/playerFactory'
import { numberDart } from '../testHelpers'
import { buildLegStartCallout } from './buildLegStartCallout'

describe('buildLegStartCallout', () => {
  const human = createPlayer('Smith', PlayerKind.Human, 'human')
  const bot = createPlayer('Jones', PlayerKind.Bot, 'bot')

  it('returns null without match progress', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [human, bot],
    })

    expect(buildLegStartCallout(controller)).toBeNull()
  })

  it('announces the leg and first thrower in a multi-player match', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [human, bot],
      matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
    })

    expect(buildLegStartCallout(controller)).toBe('Leg one, Smith to throw first, game on.')
  })

  it('announces solo multi-leg matches without a thrower name', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [human],
      matchFormat: { legsToWin: 3, startingPlayerIndex: 0 },
    })

    expect(buildLegStartCallout(controller)).toBe('Leg one, game on.')
  })

  it('uses the alternate starter on later legs', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human, bot],
      matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
    })

    controller = controller.recordDart(numberDart(20, DartMultiplier.Double))

    expect(buildLegStartCallout(controller)).toBe('Leg two, Jones to throw first, game on.')
  })
})
