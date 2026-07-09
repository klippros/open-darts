import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { tenUpOneDownEngine } from './tenUpOneDownEngine'
import { numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = {
  startScore: 60,
  incrementUp: 10,
  decrementDown: 1,
  minScore: 2,
  doubleOut: true,
}

describe('tenUpOneDownEngine', () => {
  it('creates initial state at 60', () => {
    const state = tenUpOneDownEngine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({ targetScore: 60 })
  })

  it('advances the checkout target after a successful visit', () => {
    const state = tenUpOneDownEngine.createInitialState([player], config)
    const result = tenUpOneDownEngine.commitVisit(state, player.id, 0, [
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Double),
    ])

    expect(result.visit.checkout).toBe(true)
    expect(result.state.players[player.id]?.targetScore).toBe(70)
  })

  it('shows the checkout target on the scoreboard', () => {
    const state = tenUpOneDownEngine.createInitialState([player], config)
    const scoreboard = tenUpOneDownEngine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.TenUpOneDown)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 60,
      secondaryLabel: 'Checkout target',
    })
  })
})
