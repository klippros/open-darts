import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { PlayerKind } from '../../types/player'
import { aroundTheClockEngine } from './aroundTheClockEngine'
import { numberDart } from '../testHelpers'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = { finishOnBull: true, aimMode: AroundTheClockAimMode.Any }

describe('aroundTheClockEngine', () => {
  it('creates initial state at target 1', () => {
    const state = aroundTheClockEngine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({ targetIndex: 0 })
  })

  it('advances the target after a hit', () => {
    const state = aroundTheClockEngine.createInitialState([player], config)
    const result = aroundTheClockEngine.commitVisit(state, player.id, 0, [
      numberDart(1, DartMultiplier.Single),
    ])

    expect(result.state.players[player.id]?.targetIndex).toBe(1)
    expect(result.visit.metadata).toMatchObject({ targetLabel: '1' })
    expect(result.visit.visitScore).toBe(1)
  })

  it('ignores off-target darts in the visit score', () => {
    const state = aroundTheClockEngine.createInitialState([player], config)
    const result = aroundTheClockEngine.commitVisit(state, player.id, 0, [
      numberDart(20, DartMultiplier.Triple),
      numberDart(1, DartMultiplier.Single),
    ])

    expect(result.visit.visitScore).toBe(1)
  })

  it('shows the current target on the scoreboard', () => {
    const state = aroundTheClockEngine.createInitialState([player], config)
    const scoreboard = aroundTheClockEngine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.AroundTheClock)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 1,
      primaryDisplay: '1',
      aroundTheClockTargetIndex: 0,
    })
  })
})
