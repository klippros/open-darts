import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { createDartThrow } from '../dartScoring'
import { BullRunOutcome } from '../types/bullRun'

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const buildBullRunThrow = (outcome: BullRunOutcome): DartThrow => {
  switch (outcome) {
    case BullRunOutcome.Miss:
      return createMissDart()
    case BullRunOutcome.Single:
      return createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single)
    case BullRunOutcome.Double:
      return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single)
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}
