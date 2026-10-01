import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { createDartThrow } from '../dartScoring'
import { HunterOutcome } from '../types/hunter'

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const buildHunterThrow = (outcome: HunterOutcome, fieldNumber: number): DartThrow => {
  if (outcome === HunterOutcome.Miss) {
    return createMissDart()
  }

  const multiplier =
    outcome === HunterOutcome.Single
      ? DartMultiplier.Single
      : outcome === HunterOutcome.Double
        ? DartMultiplier.Double
        : DartMultiplier.Triple

  return createDartThrow({ type: DartSegmentType.Number, value: fieldNumber }, multiplier)
}
