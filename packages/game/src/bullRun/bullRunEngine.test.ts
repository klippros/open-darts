import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { GameModeId } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import { BullRunOutcome } from '../types/bullRun'
import { bullDart, missDart, outerBullDart } from '../testHelpers'
import { buildBullRunThrow } from './buildBullRunDarts'
import { bullRunEngine } from './bullRunEngine'

const playerOne = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const playerTwo = { id: 'p2', name: 'Player 2', kind: PlayerKind.Human }
const config = { targetScore: 15 }

describe('bullRunEngine', () => {
  it('creates initial state at zero, or from startingScore for async rebuilds', () => {
    const zero = bullRunEngine.createInitialState([playerOne], config)
    expect(zero.players[playerOne.id]).toEqual({ score: 0, dartsThrown: 0 })

    const resumed = bullRunEngine.createInitialState([playerOne], {
      targetScore: 15,
      startingScore: 8,
    })
    expect(resumed.players[playerOne.id]).toEqual({ score: 8, dartsThrown: 0 })
  })

  it('commits a full visit under the target and advances the turn', () => {
    const state = bullRunEngine.createInitialState([playerOne, playerTwo], config)
    const darts = [
      buildBullRunThrow(BullRunOutcome.Single),
      buildBullRunThrow(BullRunOutcome.Double),
      buildBullRunThrow(BullRunOutcome.Miss),
    ]
    const result = bullRunEngine.commitVisit(state, playerOne.id, 0, darts)

    expect(result.visit).toMatchObject({
      visitScore: 3,
      scoreBefore: 0,
      scoreAfter: 3,
      checkout: false,
      bust: false,
      metadata: { targetScore: 15 },
    })
    expect(result.state.players[playerOne.id]).toEqual({ score: 3, dartsThrown: 3 })
    expect(result.advanceTurn).toBe(true)
    expect(bullRunEngine.isGameComplete(result.state)).toBe(false)
  })

  it('ends the visit early and wins when a dart reaches the target', () => {
    let state = bullRunEngine.createInitialState([playerOne], { targetScore: 5 })
    state = bullRunEngine.commitVisit(state, playerOne.id, 0, [
      outerBullDart(DartMultiplier.Single),
      outerBullDart(DartMultiplier.Single),
      outerBullDart(DartMultiplier.Single),
    ]).state

    const pending = [bullDart()]
    expect(bullRunEngine.shouldEndVisitEarly(state, playerOne.id, pending)).toBe(true)

    const result = bullRunEngine.commitVisit(state, playerOne.id, 1, pending)
    expect(result.visit.checkout).toBe(true)
    expect(result.visit.scoreAfter).toBe(5)
    expect(result.advanceTurn).toBe(false)
    expect(result.state.winnerId).toBe(playerOne.id)
    expect(bullRunEngine.isGameComplete(result.state)).toBe(true)
  })

  it('wins on overshoot', () => {
    const state = bullRunEngine.createInitialState([playerOne], {
      targetScore: 15,
      startingScore: 14,
    })
    const result = bullRunEngine.commitVisit(state, playerOne.id, 0, [bullDart()])

    expect(result.visit.scoreAfter).toBe(16)
    expect(result.visit.checkout).toBe(true)
    expect(result.state.winnerId).toBe(playerOne.id)
  })

  it('lets the second player win after the first falls short', () => {
    let state = bullRunEngine.createInitialState([playerOne, playerTwo], { targetScore: 5 })
    state = bullRunEngine.commitVisit(state, playerOne.id, 0, [
      missDart(),
      missDart(),
      missDart(),
    ]).state

    const result = bullRunEngine.commitVisit(state, playerTwo.id, 1, [
      bullDart(),
      bullDart(),
      bullDart(),
    ])

    expect(result.state.winnerId).toBe(playerTwo.id)
    expect(result.advanceTurn).toBe(false)
  })

  it('exposes scoreboard data with the target', () => {
    const state = bullRunEngine.createInitialState([playerOne], config)
    const scoreboard = bullRunEngine.getScoreboard(state, [playerOne], playerOne.id)

    expect(scoreboard.mode).toBe(GameModeId.BullRun)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 0,
      secondaryLabel: 'Target 15',
      isActive: true,
    })
  })
})
