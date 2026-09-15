import { SingleDartScoringMode } from '../../types/settings'
import { VisitInputMode } from '@open-darts/game/types/visit'

/** Remaining score at or below this uses per-dart entry under Sub 171. */
export const CHECKOUT_RANGE_MAX = 170

export const resolveVisitEntryMode = (
  setting: SingleDartScoringMode,
  remaining: number,
  override: VisitInputMode | null = null,
): VisitInputMode => {
  if (override !== null) {
    return override
  }

  if (setting === SingleDartScoringMode.Always) {
    return VisitInputMode.PerDart
  }

  if (setting === SingleDartScoringMode.Never) {
    return VisitInputMode.VisitScore
  }

  return remaining <= CHECKOUT_RANGE_MAX ? VisitInputMode.PerDart : VisitInputMode.VisitScore
}
