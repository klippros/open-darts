import { HitCountDartPicker } from './HitCountDartPicker'
import { buildClaimTheBoardDartsForHitCount } from '@open-darts/game/claimTheBoard/buildClaimTheBoardDarts'
import { getClaimTheBoardTarget } from '@open-darts/game/claimTheBoard/claimTheBoardRules'
import type { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { DartThrow } from '@open-darts/game/types/dart'

export interface ClaimTheBoardDartPickerProps {
  targetIndex: number
  aimMode: AroundTheClockAimMode
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

export const ClaimTheBoardDartPicker = ({
  targetIndex,
  aimMode,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: ClaimTheBoardDartPickerProps) => (
  <HitCountDartPicker
    targetLabel={getClaimTheBoardTarget(targetIndex, aimMode).label}
    onHitCount={(hitCount) => {
      onDarts(buildClaimTheBoardDartsForHitCount(hitCount, targetIndex, aimMode))
    }}
    onUndo={onUndo}
    inputDisabled={inputDisabled}
    undoDisabled={undoDisabled}
  />
)
