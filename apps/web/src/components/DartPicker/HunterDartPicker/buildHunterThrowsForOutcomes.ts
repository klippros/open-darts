import { buildHunterThrow } from '@open-darts/game/hunter/buildHunterDarts'
import {
  advanceHunterFieldIndex,
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
} from '@open-darts/game/hunter/hunterClock'
import { getHunterAdvanceForOutcome } from '@open-darts/game/hunter/hunterRules'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { HunterOutcome } from '@open-darts/game/types/hunter'

/**
 * Build visit throws for a sequence of picker outcomes, advancing the aim field
 * after each hit the same way live play does mid-visit.
 */
export const buildHunterThrowsForOutcomes = (
  outcomes: HunterOutcome[],
  startFieldNumber: number,
): DartThrow[] => {
  const darts: DartThrow[] = []
  let fieldIndex = getHunterFieldIndexForNumber(startFieldNumber)

  for (const outcome of outcomes) {
    const fieldNumber = getHunterFieldNumber(fieldIndex)
    darts.push(buildHunterThrow(outcome, fieldNumber))
    fieldIndex = advanceHunterFieldIndex(fieldIndex, getHunterAdvanceForOutcome(outcome))
  }

  return darts
}
