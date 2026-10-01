import { describe, expect, it } from 'vitest'
import { GameModeId } from '../types/gameMode'
import { HunterOutcome } from '../types/hunter'
import { PlayerKind } from '../types/player'
import { buildHunterThrow } from './buildHunterDarts'
import { DEFAULT_HUNTER_CONFIG } from './hunterConfig'
import { getHunterFieldIndexForNumber, getHunterFieldNumber } from './hunterClock'
import { hunterEngine } from './hunterEngine'

const player1 = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const player2 = { id: 'p2', name: 'Player 2', kind: PlayerKind.Human }

describe('hunterEngine', () => {
  it('places the starter on 1 and the other player on 19', () => {
    const state = hunterEngine.createInitialState([player1, player2], DEFAULT_HUNTER_CONFIG)

    expect(state.players[player1.id]?.fieldIndex).toBe(getHunterFieldIndexForNumber(1))
    expect(state.players[player2.id]?.fieldIndex).toBe(getHunterFieldIndexForNumber(19))

    const swapped = hunterEngine.createInitialState([player1, player2], {
      startingPlayerIndex: 1,
    })

    expect(swapped.players[player2.id]?.fieldIndex).toBe(getHunterFieldIndexForNumber(1))
    expect(swapped.players[player1.id]?.fieldIndex).toBe(getHunterFieldIndexForNumber(19))
  })

  it('advances on hit and rotates turn', () => {
    const state = hunterEngine.createInitialState([player1, player2], DEFAULT_HUNTER_CONFIG)
    const result = hunterEngine.commitVisit(state, player1.id, 0, [
      buildHunterThrow(HunterOutcome.Single, 1),
      buildHunterThrow(HunterOutcome.Miss, 18),
      buildHunterThrow(HunterOutcome.Miss, 18),
    ])

    expect(result.visit).toMatchObject({
      visitScore: 1,
      checkout: false,
      metadata: { advances: 1, catch: false },
    })
    expect(getHunterFieldNumber(result.state.players[player1.id]!.fieldIndex)).toBe(18)
    expect(result.advanceTurn).toBe(true)
  })

  it('ends the visit early and completes the game on catch', () => {
    const state = {
      ...hunterEngine.createInitialState([player1, player2], DEFAULT_HUNTER_CONFIG),
      players: {
        [player1.id]: { fieldIndex: getHunterFieldIndexForNumber(1) },
        [player2.id]: { fieldIndex: getHunterFieldIndexForNumber(18) },
      },
    }

    expect(
      hunterEngine.shouldEndVisitEarly(state, player1.id, [
        buildHunterThrow(HunterOutcome.Single, 1),
      ]),
    ).toBe(true)

    const result = hunterEngine.commitVisit(state, player1.id, 0, [
      buildHunterThrow(HunterOutcome.Single, 1),
    ])

    expect(result.visit.checkout).toBe(true)
    expect(result.state.winnerId).toBe(player1.id)
    expect(result.advanceTurn).toBe(false)
    expect(hunterEngine.isGameComplete(result.state)).toBe(true)
  })

  it('exposes scoreboard field numbers', () => {
    const state = hunterEngine.createInitialState([player1, player2], DEFAULT_HUNTER_CONFIG)
    const scoreboard = hunterEngine.getScoreboard(state, [player1, player2], player1.id)

    expect(scoreboard.mode).toBe(GameModeId.Hunter)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 1,
      primaryDisplay: '1',
      secondaryLabel: 'On 20 · hit 1',
      isActive: true,
    })
    expect(scoreboard.players[1]).toMatchObject({
      primaryScore: 19,
      secondaryLabel: 'On 3 · hit 19',
      isActive: false,
    })
  })
})
