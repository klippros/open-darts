import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { x01Engine } from './x01Engine'
import { bullDart, defaultX01Config, numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = defaultX01Config()

describe('x01Engine', () => {
  it('creates initial state for each player', () => {
    const state = x01Engine.createInitialState([player], config)

    expect(state.config).toEqual(config)
    expect(state.players[player.id]).toEqual({
      remaining: 501,
      hasOpened: true,
    })
  })

  it('starts closed when double-in is enabled', () => {
    const state = x01Engine.createInitialState([player], { ...config, doubleIn: true })

    expect(state.players[player.id]?.hasOpened).toBe(false)
  })

  it('previews remaining score for pending darts', () => {
    const state = x01Engine.createInitialState([player], config)
    const preview = x01Engine.applyDart(state, player.id, [numberDart(20, DartMultiplier.Triple)])

    expect(preview.players[player.id]?.remaining).toBe(441)
  })

  it('commits a visit and updates remaining score', () => {
    const state = x01Engine.createInitialState([player], config)
    const darts = [numberDart(20, DartMultiplier.Triple)]
    const result = x01Engine.commitVisit(state, player.id, 0, darts)

    expect(result.visit).toMatchObject({
      visitIndex: 0,
      playerId: player.id,
      scoreBefore: 501,
      scoreAfter: 441,
      visitScore: 60,
      bust: false,
      checkout: false,
    })
    expect(result.state.players[player.id]?.remaining).toBe(441)
    expect(result.advanceTurn).toBe(true)
  })

  it('ends the game on checkout', () => {
    const state = x01Engine.createInitialState([player], { ...config, startScore: 40 })
    const result = x01Engine.commitVisit(state, player.id, 0, [
      numberDart(20, DartMultiplier.Double),
    ])

    expect(result.visit.checkout).toBe(true)
    expect(result.state.winnerId).toBe(player.id)
    expect(result.advanceTurn).toBe(false)
    expect(x01Engine.isGameComplete(result.state)).toBe(true)
  })

  it('ends a visit early on checkout or bust', () => {
    const state = x01Engine.createInitialState([player], { ...config, startScore: 40 })

    expect(
      x01Engine.shouldEndVisitEarly(state, player.id, [numberDart(20, DartMultiplier.Double)]),
    ).toBe(true)
    expect(
      x01Engine.shouldEndVisitEarly(state, player.id, [numberDart(20, DartMultiplier.Triple)]),
    ).toBe(true)
    expect(
      x01Engine.shouldEndVisitEarly(state, player.id, [numberDart(10, DartMultiplier.Single)]),
    ).toBe(false)
  })

  it('builds scoreboard entries for active player', () => {
    const state = x01Engine.createInitialState([player], config)
    const scoreboard = x01Engine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.X01)
    expect(scoreboard.players).toEqual([
      {
        playerId: player.id,
        name: player.name,
        primaryScore: 501,
        isActive: true,
      },
    ])
  })

  it('records bust visits without changing remaining score', () => {
    const state = x01Engine.createInitialState([player], { ...config, startScore: 50 })
    const result = x01Engine.commitVisit(state, player.id, 0, [
      numberDart(20, DartMultiplier.Triple),
    ])

    expect(result.visit.bust).toBe(true)
    expect(result.visit.visitScore).toBe(0)
    expect(result.state.players[player.id]?.remaining).toBe(50)
  })

  it('allows bull checkout', () => {
    const state = x01Engine.createInitialState([player], { ...config, startScore: 50 })
    const result = x01Engine.commitVisit(state, player.id, 0, [bullDart()])

    expect(result.visit.checkout).toBe(true)
    expect(result.state.players[player.id]?.remaining).toBe(0)
  })
})
