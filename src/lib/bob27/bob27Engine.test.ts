import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { bob27Engine } from './bob27Engine'
import { numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = { startScore: 27 }

describe('bob27Engine', () => {
  it('creates initial state with the starting score and D1 target', () => {
    const state = bob27Engine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({ score: 27, targetIndex: 0 })
  })

  it('ends a visit early when the target double is hit', () => {
    const state = bob27Engine.createInitialState([player], config)
    const shouldEnd = bob27Engine.shouldEndVisitEarly(state, player.id, [
      numberDart(1, DartMultiplier.Double),
    ])

    expect(shouldEnd).toBe(true)
  })

  it('commits a successful visit and advances the target', () => {
    const state = bob27Engine.createInitialState([player], config)
    const result = bob27Engine.commitVisit(state, player.id, 0, [
      numberDart(1, DartMultiplier.Double),
    ])

    expect(result.visit).toMatchObject({
      visitScore: 2,
      scoreBefore: 27,
      scoreAfter: 29,
      checkout: false,
      metadata: { targetLabel: 'D1', hit: true },
    })
    expect(result.state.players[player.id]).toEqual({ score: 29, targetIndex: 1 })
    expect(result.advanceTurn).toBe(false)
  })

  it('exposes scoreboard data with the active target label', () => {
    const state = bob27Engine.createInitialState([player], config)
    const scoreboard = bob27Engine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.Bob27)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 27,
      secondaryLabel: 'Target D1',
      isActive: true,
    })
  })
})
