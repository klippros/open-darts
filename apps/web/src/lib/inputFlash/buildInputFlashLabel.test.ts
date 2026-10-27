import { describe, expect, it } from 'vitest'
import { buildBob27DartsForHitCount } from '@open-darts/game/bob27/buildBob27Darts'
import { buildClaimTheBoardDartsForHitCount } from '@open-darts/game/claimTheBoard/buildClaimTheBoardDarts'
import { createGameController } from '@open-darts/game/game/createSession'
import { createPlayer } from '@open-darts/game/game/playerFactory'
import {
  createHitDartForTarget,
  buildDartsForMissAll,
} from '@open-darts/game/aroundTheClock/buildAroundTheClockDarts'
import { buildHunterThrowsForOutcomes } from '../../components/DartPicker/HunterDartPicker/buildHunterThrowsForOutcomes'
import { buildNinetyNineDartsThrow } from '@open-darts/game/ninetyNineDarts/buildNinetyNineDarts'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import { DartMultiplier } from '@open-darts/game/types/dart'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import {
  NinetyNineDartsOutcome,
  NinetyNineDartsTargetKind,
} from '@open-darts/game/types/ninetyNineDarts'
import { PlayerKind } from '@open-darts/game/types/player'
import { numberDart, missDart, bullDart } from '@open-darts/game/testHelpers'
import { buildInputFlashFromTransition, inputFlashLabels } from './buildInputFlashLabel'
import { toInputFlashSnapshot } from './toInputFlashSnapshot'

const solo = createPlayer('Alice', PlayerKind.Human, 'p1')
const opponent = createPlayer('Bob', PlayerKind.Human, 'p2')

describe('buildInputFlashFromTransition', () => {
  it('flashes board dart labels for X01', () => {
    const before = createGameController({ mode: GameModeId.X01, players: [solo] })
    const after = before.recordDart(numberDart(20, DartMultiplier.Triple))

    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(after)),
    ).toEqual({
      text: 'T20',
      kind: 'input',
    })
  })

  it('flashes Game Shot on X01 checkout and Bust on bust', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      players: [solo],
      config: { startScore: 40, doubleIn: false, doubleOut: true },
    })
    const beforeCheckout = controller
    const afterCheckout = controller.recordDart(numberDart(20, DartMultiplier.Double))

    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(beforeCheckout),
        toInputFlashSnapshot(afterCheckout),
      ),
    ).toEqual({ text: inputFlashLabels.gameShot, kind: 'input' })

    controller = createGameController({
      mode: GameModeId.X01,
      players: [solo],
      config: { startScore: 40, doubleIn: false, doubleOut: true },
    })
    const beforeBust = controller
    const afterBust = controller.recordDart(numberDart(20, DartMultiplier.Triple))

    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(beforeBust),
        toInputFlashSnapshot(afterBust),
      ),
    ).toEqual({ text: inputFlashLabels.bust, kind: 'input' })
  })

  it('flashes visit score totals and Failed / Game Shot for 10 Up', () => {
    const before = createGameController({ mode: GameModeId.X01, players: [solo] })
    const after = before.recordVisitScore(140)

    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(after)),
    ).toEqual({
      text: '140',
      kind: 'input',
    })

    const tenBefore = createGameController({ mode: GameModeId.TenUpOneDown, players: [solo] })
    const tenFailed = tenBefore.recordVisitScore(0)
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(tenBefore),
        toInputFlashSnapshot(tenFailed),
      ),
    ).toEqual({ text: inputFlashLabels.failed, kind: 'input' })

    const tenCheckoutBefore = createGameController({
      mode: GameModeId.TenUpOneDown,
      players: [solo],
      config: {
        startScore: 40,
        incrementUp: 10,
        decrementDown: 1,
        minScore: 2,
        doubleOut: true,
      },
    })
    const tenCheckout = tenCheckoutBefore.recordVisitScore(40)
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(tenCheckoutBefore),
        toInputFlashSnapshot(tenCheckout),
      ),
    ).toEqual({ text: inputFlashLabels.gameShot, kind: 'input' })
  })

  it("flashes Bob's 27 visit deltas", () => {
    const before = createGameController({ mode: GameModeId.Bob27, players: [solo] })
    // D1 value 2: 0 hits → -2, 2 hits → +4
    const missVisit = before.recordDarts(buildBob27DartsForHitCount(0, 0))
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(missVisit)),
    ).toEqual({ text: '-2', kind: 'input' })

    const hitVisit = before.recordDarts(buildBob27DartsForHitCount(2, 0))
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(hitVisit)),
    ).toEqual({ text: '+4', kind: 'input' })
  })

  it('flashes Claim the Board points or Miss', () => {
    const before = createGameController({
      mode: GameModeId.ClaimTheBoard,
      players: [solo],
      config: { aimMode: AroundTheClockAimMode.Any },
    })
    const missVisit = before.recordDarts(
      buildClaimTheBoardDartsForHitCount(0, 0, AroundTheClockAimMode.Any),
    )
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(missVisit)),
    ).toEqual({ text: inputFlashLabels.miss, kind: 'input' })

    const hitVisit = before.recordDarts(
      buildClaimTheBoardDartsForHitCount(2, 0, AroundTheClockAimMode.Any),
    )
    // Face 1 × 2
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(hitVisit)),
    ).toEqual({ text: '+2', kind: 'input' })
  })

  it('flashes Around the Clock aim labels and Miss for all-miss', () => {
    const before = createGameController({
      mode: GameModeId.AroundTheClock,
      players: [solo],
      config: { finishOnBull: true, aimMode: AroundTheClockAimMode.Doubles },
    })
    const hit = before.recordDarts([createHitDartForTarget(0, AroundTheClockAimMode.Doubles)])
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(hit)),
    ).toEqual({
      text: 'D1',
      kind: 'input',
    })

    const miss = before.recordDarts(buildDartsForMissAll(3))
    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(miss)),
    ).toEqual({
      text: inputFlashLabels.miss,
      kind: 'input',
    })
  })

  it('flashes 99 Darts and Hunter signed point totals for taps and swipes', () => {
    const ninetyBefore = createGameController({
      mode: GameModeId.NinetyNineDarts,
      players: [solo],
      config: { target: { kind: NinetyNineDartsTargetKind.Number, value: 20 } },
    })
    const oneDart = ninetyBefore.recordDart(
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, {
        kind: NinetyNineDartsTargetKind.Number,
        value: 20,
      }),
    )
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(ninetyBefore),
        toInputFlashSnapshot(oneDart),
      ),
    ).toEqual({ text: '+3', kind: 'input' })

    const swipe = ninetyBefore.recordDarts([
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, {
        kind: NinetyNineDartsTargetKind.Number,
        value: 20,
      }),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, {
        kind: NinetyNineDartsTargetKind.Number,
        value: 20,
      }),
      buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, {
        kind: NinetyNineDartsTargetKind.Number,
        value: 20,
      }),
    ])
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(ninetyBefore),
        toInputFlashSnapshot(swipe),
      ),
    ).toEqual({ text: '+6', kind: 'input' })

    const hunterBefore = createGameController({
      mode: GameModeId.Hunter,
      players: [solo, opponent],
    })
    const hunterField = toInputFlashSnapshot(hunterBefore).hunterFieldNumber
    expect(hunterField).toBeDefined()

    const hunterSwipe = hunterBefore.recordDarts(
      buildHunterThrowsForOutcomes(
        [HunterOutcome.Triple, HunterOutcome.Single, HunterOutcome.Miss],
        hunterField!,
      ),
    )
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(hunterBefore),
        toInputFlashSnapshot(hunterSwipe),
      ),
    ).toEqual({ text: '+4', kind: 'input' })
  })

  it('flashes Life lost for a failed 121 round', () => {
    let controller = createGameController({ mode: GameModeId.OneTwentyOne, players: [solo] })
    // Fail three visits on 121 without checkout
    controller = controller.recordVisitScore(0).recordVisitScore(0)
    const before = controller
    const after = controller.recordVisitScore(0)

    expect(
      buildInputFlashFromTransition(toInputFlashSnapshot(before), toInputFlashSnapshot(after)),
    ).toEqual({
      text: inputFlashLabels.lifeLost,
      kind: 'input',
    })
  })

  it('prefixes Undo for dart and visit undos', () => {
    const withDart = createGameController({ mode: GameModeId.X01, players: [solo] }).recordDart(
      numberDart(20, DartMultiplier.Triple),
    )
    const afterUndoDart = withDart.undoDart()
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(withDart),
        toInputFlashSnapshot(afterUndoDart),
        {
          didUndo: true,
        },
      ),
    ).toEqual({ text: 'Undo T20', kind: 'undo' })

    const bob = createGameController({ mode: GameModeId.Bob27, players: [solo] }).recordDarts(
      buildBob27DartsForHitCount(1, 0),
    )
    const afterUndoVisit = bob.undoDart()
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(bob),
        toInputFlashSnapshot(afterUndoVisit),
        {
          didUndo: true,
        },
      ),
    ).toEqual({ text: 'Undo +2', kind: 'undo' })

    const claimMiss = createGameController({
      mode: GameModeId.ClaimTheBoard,
      players: [solo],
    }).recordDarts(buildClaimTheBoardDartsForHitCount(0, 0, AroundTheClockAimMode.Any))
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(claimMiss),
        toInputFlashSnapshot(claimMiss.undoDart()),
        { didUndo: true },
      ),
    ).toEqual({ text: 'Undo Miss', kind: 'undo' })
  })

  it('undos a single 99 Darts dart by its points', () => {
    const withTwo = createGameController({
      mode: GameModeId.NinetyNineDarts,
      players: [solo],
      config: { target: { kind: NinetyNineDartsTargetKind.Number, value: 20 } },
    })
      .recordDart(
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, {
          kind: NinetyNineDartsTargetKind.Number,
          value: 20,
        }),
      )
      .recordDart(
        buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, {
          kind: NinetyNineDartsTargetKind.Number,
          value: 20,
        }),
      )

    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(withTwo),
        toInputFlashSnapshot(withTwo.undoDart()),
        { didUndo: true },
      ),
    ).toEqual({ text: 'Undo +2', kind: 'undo' })
  })

  it('returns null when nothing changed', () => {
    const controller = createGameController({ mode: GameModeId.X01, players: [solo] })
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(controller),
        toInputFlashSnapshot(controller),
      ),
    ).toBeNull()
  })
})

describe('board miss and bull labels', () => {
  it('formats Miss and Bull', () => {
    const before = createGameController({ mode: GameModeId.X01, players: [solo] })
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(before),
        toInputFlashSnapshot(before.recordDart(missDart())),
      ),
    ).toEqual({ text: 'Miss', kind: 'input' })
    expect(
      buildInputFlashFromTransition(
        toInputFlashSnapshot(before),
        toInputFlashSnapshot(before.recordDart(bullDart())),
      ),
    ).toEqual({ text: 'Bull', kind: 'input' })
  })
})
