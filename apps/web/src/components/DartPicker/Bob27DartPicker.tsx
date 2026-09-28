import { HitCountDartPicker } from './HitCountDartPicker'
import { buildBob27DartsForHitCount } from '@open-darts/game/bob27/buildBob27Darts'
import { getBob27Target } from '@open-darts/game/bob27/bob27Rules'
import type { DartThrow } from '@open-darts/game/types/dart'

export interface Bob27DartPickerProps {
  targetIndex: number
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

export const Bob27DartPicker = ({
  targetIndex,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: Bob27DartPickerProps) => (
  <HitCountDartPicker
    targetLabel={getBob27Target(targetIndex).label}
    onHitCount={(hitCount) => {
      onDarts(buildBob27DartsForHitCount(hitCount, targetIndex))
    }}
    onUndo={onUndo}
    inputDisabled={inputDisabled}
    undoDisabled={undoDisabled}
  />
)
