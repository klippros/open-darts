import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { oneTwentyOneEngine } from './oneTwentyOneEngine'
import { numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = { startScore: 121, increment: 20, doubleOut: true }

describe('oneTwentyOneEngine', () => {
  it('creates initial state at 121', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({ targetScore: 121 })
  })

  it('advances the checkout target after a successful visit', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)
    const result = oneTwentyOneEngine.commitVisit(state, player.id, 0, [
      numberDart(20, DartMultiplier.Triple),
      numberDart(17, DartMultiplier.Triple),
      numberDart(5, DartMultiplier.Double),
    ])

    expect(result.visit.checkout).toBe(true)
    expect(result.state.players[player.id]?.targetScore).toBe(141)
  })

  it('shows the checkout target on the scoreboard', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)
    const scoreboard = oneTwentyOneEngine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.OneTwentyOne)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 121,
      secondaryLabel: 'Checkout target',
    })
  })
})
