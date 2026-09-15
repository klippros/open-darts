import { describe, expect, it } from 'vitest'
import { GameModeId } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import { buildNinetyNineDartsThrow } from './buildNinetyNineDarts'
import { ninetyNineDartsEngine } from './ninetyNineDartsEngine'
import { NINETY_NINE_DARTS_DART_COUNT } from './ninetyNineDartsRules'

const player = { id: 'p1', name: 'Player 1', kind: PlayerKind.Human }
const config = { target: { kind: NinetyNineDartsTargetKind.Number, value: 20 } as const }

describe('ninetyNineDartsEngine', () => {
  it('creates initial state with zero score and darts', () => {
    const state = ninetyNineDartsEngine.createInitialState([player], config)

    expect(state.players[player.id]).toEqual({ score: 0, dartsThrown: 0 })
    expect(state.config.target).toEqual({ kind: NinetyNineDartsTargetKind.Number, value: 20 })
  })

  it('does not end a visit early', () => {
    const state = ninetyNineDartsEngine.createInitialState([player], config)
    const shouldEnd = ninetyNineDartsEngine.shouldEndVisitEarly(state, player.id, [
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, config.target),
    ])

    expect(shouldEnd).toBe(false)
  })

  it('commits a visit with practice points and stays on the same target', () => {
    const state = ninetyNineDartsEngine.createInitialState([player], config)
    const darts = [
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, config.target),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, config.target),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, config.target),
    ]
    const result = ninetyNineDartsEngine.commitVisit(state, player.id, 0, darts)

    expect(result.visit).toMatchObject({
      visitScore: 6,
      scoreBefore: 0,
      scoreAfter: 6,
      checkout: false,
      metadata: { targetLabel: '20' },
    })
    expect(result.state.players[player.id]).toEqual({ score: 6, dartsThrown: 3 })
    expect(result.advanceTurn).toBe(false)
    expect(ninetyNineDartsEngine.isGameComplete(result.state)).toBe(false)
  })

  it('completes after 99 darts', () => {
    let state = ninetyNineDartsEngine.createInitialState([player], {
      target: { kind: NinetyNineDartsTargetKind.Bull },
    })
    const bullTarget = { kind: NinetyNineDartsTargetKind.Bull } as const

    for (let visit = 0; visit < 32; visit += 1) {
      const darts = [
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, bullTarget),
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bullTarget),
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Miss, bullTarget),
      ]
      const result = ninetyNineDartsEngine.commitVisit(state, player.id, visit, darts)
      state = result.state
      expect(result.visit.checkout).toBe(false)
    }

    const finalDarts = [
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bullTarget),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bullTarget),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bullTarget),
    ]
    const finalResult = ninetyNineDartsEngine.commitVisit(state, player.id, 32, finalDarts)

    expect(finalResult.visit.checkout).toBe(true)
    expect(finalResult.state.players[player.id]?.dartsThrown).toBe(NINETY_NINE_DARTS_DART_COUNT)
    expect(finalResult.state.winnerId).toBe(player.id)
    expect(ninetyNineDartsEngine.isGameComplete(finalResult.state)).toBe(true)
  })

  it('exposes scoreboard data with darts remaining', () => {
    const state = ninetyNineDartsEngine.createInitialState([player], config)
    const scoreboard = ninetyNineDartsEngine.getScoreboard(state, [player], player.id)

    expect(scoreboard.mode).toBe(GameModeId.NinetyNineDarts)
    expect(scoreboard.players[0]).toMatchObject({
      primaryScore: 0,
      secondaryLabel: '99 left · 20',
      isActive: true,
    })
  })
})
