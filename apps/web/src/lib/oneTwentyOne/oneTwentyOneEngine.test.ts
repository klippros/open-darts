import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { PlayerKind } from '../../types/player'
import { oneTwentyOneEngine } from './oneTwentyOneEngine'
import { DEFAULT_ONE_TWENTY_ONE_CONFIG } from './oneTwentyOneConfig'
import { numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = DEFAULT_ONE_TWENTY_ONE_CONFIG

const checkout121 = [
  numberDart(20, DartMultiplier.Triple),
  numberDart(17, DartMultiplier.Triple),
  numberDart(5, DartMultiplier.Double),
]

const scoringVisit = [
  numberDart(20, DartMultiplier.Single),
  numberDart(20, DartMultiplier.Single),
  numberDart(20, DartMultiplier.Single),
]

describe('oneTwentyOneEngine', () => {
  it('creates initial state at 121 with three lives', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({
      roundTarget: 121,
      remaining: 121,
      lives: 3,
      visitsOnTarget: 0,
      peakTarget: 121,
    })
  })

  it('advances the round target by one after a successful visit', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)
    const result = oneTwentyOneEngine.commitVisit(state, player.id, 0, checkout121)

    expect(result.visit.checkout).toBe(true)
    expect(result.state.players[player.id]).toMatchObject({
      roundTarget: 122,
      remaining: 122,
      lives: 4,
      visitsOnTarget: 0,
      peakTarget: 122,
    })
  })

  it('carries remaining score to the next visit in the same round', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)
    const result = oneTwentyOneEngine.commitVisit(state, player.id, 0, scoringVisit)

    expect(result.state.players[player.id]).toMatchObject({
      roundTarget: 121,
      remaining: 61,
      visitsOnTarget: 1,
    })
  })

  it('shows remaining score on the scoreboard', () => {
    const state = oneTwentyOneEngine.createInitialState([player], config)
    const afterVisit = oneTwentyOneEngine.commitVisit(state, player.id, 0, scoringVisit)
    const scoreboard = oneTwentyOneEngine.getScoreboard(afterVisit.state, [player], player.id)

    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 61,
      lives: 3,
      visitsOnTarget: 1,
    })
  })

  it('marks the game complete when lives reach zero', () => {
    const state = oneTwentyOneEngine.createInitialState([player], {
      ...config,
      startingLives: 1,
    })
    let current = state

    for (let visit = 0; visit < 3; visit += 1) {
      const result = oneTwentyOneEngine.commitVisit(current, player.id, visit, scoringVisit)
      current = result.state
    }

    expect(current.players[player.id]?.lives).toBe(0)
    expect(oneTwentyOneEngine.isGameComplete(current)).toBe(true)
  })
})
