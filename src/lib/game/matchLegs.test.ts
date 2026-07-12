import { describe, expect, it } from 'vitest'
import { PlayerKind } from '../../types/player'
import { createGameController } from './createSession'
import { GameModeId } from '../../types/gameMode'
import { numberDart } from '../testHelpers'
import { DartMultiplier } from '../../types/dart'
import {
  createInitialMatchProgress,
  getLegStartingPlayerIndex,
  getLegWinnerIdFromVisits,
  getMaxPossibleLegs,
  isMatchComplete,
  parseLegsToWin,
  parseStartingPlayerIndex,
  recordLegWin,
} from './matchLegs'
import { createBotPlayer, createSoloHumanPlayer } from './playerFactory'

describe('matchLegs', () => {
  it('parses legs to win and starter params', () => {
    expect(parseLegsToWin('5')).toBe(5)
    expect(parseLegsToWin('99')).toBe(15)
    expect(parseStartingPlayerIndex('1', 2)).toBe(1)
    expect(parseStartingPlayerIndex(null, 1)).toBe(0)
  })

  it('alternates leg starters after the first leg', () => {
    expect(getLegStartingPlayerIndex(0, 1, 2)).toBe(0)
    expect(getLegStartingPlayerIndex(0, 2, 2)).toBe(1)
    expect(getLegStartingPlayerIndex(1, 2, 2)).toBe(0)
  })

  it('finds the leg winner from checkout visits', () => {
    const visits = [
      {
        visitIndex: 0,
        playerId: 'player-1',
        darts: [],
        visitScore: 60,
        scoreBefore: 501,
        scoreAfter: 441,
        bust: false,
        checkout: false,
        legIndex: 2,
      },
      {
        visitIndex: 1,
        playerId: 'player-2',
        darts: [],
        visitScore: 40,
        scoreBefore: 40,
        scoreAfter: 0,
        bust: false,
        checkout: true,
        legIndex: 2,
      },
    ]

    expect(getLegWinnerIdFromVisits(visits, 2)).toBe('player-2')
    expect(getLegWinnerIdFromVisits(visits, 1)).toBeUndefined()
  })

  it('calculates max possible legs for first-to formats', () => {
    expect(getMaxPossibleLegs(2, 2)).toBe(3)
    expect(getMaxPossibleLegs(6, 2)).toBe(11)
  })

  it('ends the match when a player reaches the legs-to-win target', () => {
    const human = createSoloHumanPlayer()
    const bot = createBotPlayer(5)
    const progress = createInitialMatchProgress([human, bot], {
      legsToWin: 2,
      startingPlayerIndex: 0,
    })

    expect(progress).toBeDefined()

    const afterOneLeg = recordLegWin(progress!, human.id)
    expect(isMatchComplete(afterOneLeg, 2)).toBe(false)

    const afterTwoLegs = recordLegWin(afterOneLeg, human.id)
    expect(isMatchComplete(afterTwoLegs, 2)).toBe(true)
  })

  it('ends solo sessions after the configured number of legs', () => {
    const human = createSoloHumanPlayer()
    const progress = createInitialMatchProgress([human], {
      legsToWin: 3,
      startingPlayerIndex: 0,
    })

    expect(progress).toBeDefined()

    const afterTwoLegs = recordLegWin(recordLegWin(progress!, human.id), human.id)
    expect(isMatchComplete(afterTwoLegs, 1)).toBe(false)

    const afterThreeLegs = recordLegWin(afterTwoLegs, human.id)
    expect(isMatchComplete(afterThreeLegs, 1)).toBe(true)
  })
})

describe('multi-leg x01 matches', () => {
  const checkoutDart = (scoreBefore: number) => numberDart(scoreBefore / 2, DartMultiplier.Double)

  it('continues until a player reaches the legs-to-win target', () => {
    const human = createSoloHumanPlayer()
    const bot = createBotPlayer(5)
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human, bot],
      matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
    })

    controller = controller.recordDart(checkoutDart(40))
    expect(controller.session.matchProgress?.legWins[human.id]).toBe(1)
    expect(controller.session.matchProgress?.currentLeg).toBe(2)
    expect(controller.isComplete).toBe(false)
    expect(controller.activePlayerId).toBe(bot.id)

    controller = controller.recordDart(checkoutDart(40))
    expect(controller.isComplete).toBe(false)
    expect(controller.session.matchProgress?.currentLeg).toBe(3)
    expect(controller.session.matchProgress?.legWins[bot.id]).toBe(1)

    controller = controller.recordDart(checkoutDart(40))
    expect(controller.isComplete).toBe(true)
    expect(controller.session.matchProgress?.legWins[human.id]).toBe(2)
  })

  it('starts on the selected player for leg one', () => {
    const human = createSoloHumanPlayer()
    const bot = createBotPlayer(5)
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [human, bot],
      matchFormat: { legsToWin: 3, startingPlayerIndex: 1 },
    })

    expect(controller.activePlayer.kind).toBe(PlayerKind.Bot)
  })
})

describe('solo multi-leg x01 sessions', () => {
  const checkoutDart = (scoreBefore: number) => numberDart(scoreBefore / 2, DartMultiplier.Double)

  it('plays exactly the configured number of legs with no match winner', () => {
    const human = createSoloHumanPlayer()
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human],
      matchFormat: { legsToWin: 2, startingPlayerIndex: 0 },
    })

    controller = controller.recordDart(checkoutDart(40))
    expect(controller.isComplete).toBe(false)
    expect(controller.session.matchProgress?.currentLeg).toBe(2)

    controller = controller.recordDart(checkoutDart(40))
    expect(controller.isComplete).toBe(true)
    expect(controller.session.matchProgress?.legWins[human.id]).toBe(2)
  })
})
