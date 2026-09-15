import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { createDartThrow } from '../dartScoring'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '../types/ninetyNineDarts'
import { isNinetyNineDartsTripleAllowed } from './ninetyNineDartsRules'

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const buildNinetyNineDartsThrow = (
  outcome: NinetyNineDartsOutcome,
  target: NinetyNineDartsTarget,
): DartThrow => {
  if (outcome === NinetyNineDartsOutcome.Miss) {
    return createMissDart()
  }

  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    if (outcome === NinetyNineDartsOutcome.Single) {
      return createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single)
    }

    if (outcome === NinetyNineDartsOutcome.Double) {
      return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single)
    }

    throw new Error('Triple is not allowed on bull')
  }

  if (outcome === NinetyNineDartsOutcome.Triple && !isNinetyNineDartsTripleAllowed(target)) {
    throw new Error('Triple is not allowed for this target')
  }

  const multiplier =
    outcome === NinetyNineDartsOutcome.Single
      ? DartMultiplier.Single
      : outcome === NinetyNineDartsOutcome.Double
        ? DartMultiplier.Double
        : DartMultiplier.Triple

  return createDartThrow({ type: DartSegmentType.Number, value: target.value }, multiplier)
}
