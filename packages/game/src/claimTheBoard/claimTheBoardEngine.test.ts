import { describe, expect, it } from 'vitest'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { GameModeId } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import { claimTheBoardEngine } from './claimTheBoardEngine'
import { buildClaimTheBoardDartsForHitCount } from './buildClaimTheBoardDarts'

const player1 = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const player2 = { id: 'p2', name: 'Player 2', kind: PlayerKind.Human }
const config = { aimMode: AroundTheClockAimMode.Doubles }

describe('claimTheBoardEngine', () => {
  it('creates initial shared state at target 1 with zero scores', () => {
    const state = claimTheBoardEngine.createInitialState([player1, player2], config)

    expect(state.sharedTargetIndex).toBe(0)
    expect(state.players[player1.id]).toEqual({ score: 0 })
    expect(state.players[player2.id]).toEqual({ score: 0 })
  })

  it('does not end a visit early on a hit', () => {
    const state = claimTheBoardEngine.createInitialState([player1, player2], config)
    const shouldEnd = claimTheBoardEngine.shouldEndVisitEarly(
      state,
      player1.id,
      buildClaimTheBoardDartsForHitCount(1, 0, config.aimMode).slice(0, 1),
    )

    expect(shouldEnd).toBe(false)
  })

  it('advances the shared target on hit and rotates turn', () => {
    const state = claimTheBoardEngine.createInitialState([player1, player2], config)
    const result = claimTheBoardEngine.commitVisit(
      state,
      player1.id,
      0,
      buildClaimTheBoardDartsForHitCount(2, 0, config.aimMode),
    )

    expect(result.visit).toMatchObject({
      visitScore: 4,
      scoreBefore: 0,
      scoreAfter: 4,
      checkout: false,
      metadata: { targetLabel: 'D1', hit: true, hitCount: 2 },
    })
    expect(result.state.sharedTargetIndex).toBe(1)
    expect(result.state.players[player1.id]).toEqual({ score: 4 })
    expect(result.advanceTurn).toBe(true)
  })

  it('keeps the shared target on a miss and still advances turn', () => {
    const state = claimTheBoardEngine.createInitialState([player1, player2], config)
    const result = claimTheBoardEngine.commitVisit(
      state,
      player1.id,
      0,
      buildClaimTheBoardDartsForHitCount(0, 0, config.aimMode),
    )

    expect(result.visit).toMatchObject({
      visitScore: 0,
      scoreAfter: 0,
      metadata: { hit: false, hitCount: 0 },
    })
    expect(result.state.sharedTargetIndex).toBe(0)
    expect(result.advanceTurn).toBe(true)
  })

  it('completes the leg after a successful last-target visit', () => {
    const state = {
      ...claimTheBoardEngine.createInitialState([player1, player2], config),
      sharedTargetIndex: 20,
      players: {
        [player1.id]: { score: 30 },
        [player2.id]: { score: 40 },
      },
    }

    const result = claimTheBoardEngine.commitVisit(
      state,
      player1.id,
      0,
      buildClaimTheBoardDartsForHitCount(2, 20, config.aimMode),
    )

    expect(result.visit).toMatchObject({
      visitScore: 50,
      scoreAfter: 80,
      checkout: true,
    })
    expect(result.state.winnerId).toBe(player1.id)
    expect(result.advanceTurn).toBe(false)
    expect(claimTheBoardEngine.isGameComplete(result.state)).toBe(true)
  })

  it('exposes scoreboard scores with the shared target label', () => {
    const state = claimTheBoardEngine.createInitialState([player1, player2], config)
    const scoreboard = claimTheBoardEngine.getScoreboard(state, [player1, player2], player1.id)

    expect(scoreboard.mode).toBe(GameModeId.ClaimTheBoard)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 0,
      secondaryLabel: 'Target D1',
      isActive: true,
    })
    expect(scoreboard.players[1]).toMatchObject({
      primaryScore: 0,
      secondaryLabel: 'Target D1',
      isActive: false,
    })
  })
})
