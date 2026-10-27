import { Grid, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { VisitDartSlotCard } from '../../Scoreboard/VisitDartSlotCard'
import { PressScaleButton } from '../../PressScaleButton/PressScaleButton'
import { scoringActionTypeProps } from '../../../scoringType'
import { useUiSounds } from '../../../hooks/useUiSounds'
import { buildNinetyNineDartsThrow } from '@open-darts/game/ninetyNineDarts/buildNinetyNineDarts'
import {
  getNinetyNineDartsOutcome,
  getNinetyNineDartsPickerOutcomes,
  NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
} from '@open-darts/game/ninetyNineDarts/ninetyNineDartsRules'
import { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '@open-darts/game/types/ninetyNineDarts'
import type { DartThrow } from '@open-darts/game/types/dart'
import { useVisitOutcomeSwipe } from '../visitOutcomeSwipe/useVisitOutcomeSwipe'

export interface NinetyNineDartsDartPickerProps {
  target: NinetyNineDartsTarget
  pendingDarts: DartThrow[]
  /** Append only new darts — must not re-send already pending throws. */
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

const OUTCOME_LABELS: Record<NinetyNineDartsOutcome, string> = {
  [NinetyNineDartsOutcome.Miss]: 'Miss',
  [NinetyNineDartsOutcome.Single]: 'Single',
  [NinetyNineDartsOutcome.Double]: 'Double',
  [NinetyNineDartsOutcome.Triple]: 'Treble',
}

const SWIPE_OUTCOMES = new Set<string>(Object.values(NinetyNineDartsOutcome))

/** Picker outcomes are bottom→top; reverse for visual column (Double at top). */
const reverseForDisplay = <T,>(items: T[]): T[] => [...items].reverse()

const getOutcomeSlotSize = (
  outcome: NinetyNineDartsOutcome,
  hasTriple: boolean,
): 'comfortable' | 'comfortableHalf' =>
  hasTriple && outcome === NinetyNineDartsOutcome.Double ? 'comfortableHalf' : 'comfortable'

const isSwipeOutcome = (value: string): value is NinetyNineDartsOutcome => SWIPE_OUTCOMES.has(value)

const parseOutcome = (value: string): NinetyNineDartsOutcome | null =>
  isSwipeOutcome(value) ? value : null

const toneForOutcome = (outcome: NinetyNineDartsOutcome): 'red' | 'green' =>
  outcome === NinetyNineDartsOutcome.Miss ? 'red' : 'green'

export const NinetyNineDartsDartPicker = ({
  target,
  pendingDarts,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: NinetyNineDartsDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const outcomes = getNinetyNineDartsPickerOutcomes(target)
  const displayOutcomes = reverseForDisplay(outcomes)
  const hasTriple = outcomes.includes(NinetyNineDartsOutcome.Triple)
  const pendingCount = pendingDarts.length

  const recordOutcomes = useCallback(
    (resolved: NinetyNineDartsOutcome[]) => {
      if (inputDisabled || resolved.length === 0) {
        return
      }

      const remaining = NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT - pendingCount
      const toRecord = resolved.slice(0, Math.max(0, remaining))

      if (toRecord.length === 0) {
        return
      }

      if (toRecord.every((outcome) => outcome === NinetyNineDartsOutcome.Miss)) {
        playMiss()
      } else {
        playHit()
      }

      onDarts(toRecord.map((outcome) => buildNinetyNineDartsThrow(outcome, target)))
    },
    [inputDisabled, onDarts, pendingCount, playHit, playMiss, target],
  )

  const {
    gridRef,
    availableColumn,
    previewForColumn,
    isTapTarget,
    handleSlotClick,
    gridPointerProps,
  } = useVisitOutcomeSwipe({
    parseOutcome,
    pendingCount,
    visitDartCount: NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
    inputDisabled,
    onCommit: recordOutcomes,
  })

  return (
    <Stack gap={3}>
      <Grid
        ref={gridRef}
        templateColumns={`repeat(${NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT}, 1fr)`}
        gap={3}
        touchAction="none"
        {...gridPointerProps}
      >
        {Array.from({ length: NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT }, (_, slotIndex) => {
          const isThrown = slotIndex < pendingCount
          const tapTarget = isTapTarget(slotIndex)
          const previewOutcome = previewForColumn(slotIndex)
          const isAvailableColumn = availableColumn === slotIndex
          const thrownDart = pendingDarts[slotIndex]
          const thrownOutcome =
            thrownDart === undefined ? null : getNinetyNineDartsOutcome(thrownDart, target)
          const selectedOutcome = isThrown ? thrownOutcome : previewOutcome

          if (selectedOutcome !== null) {
            return (
              <Stack key={slotIndex} gap={2}>
                {displayOutcomes.map((outcome) => {
                  const isSelected = outcome === selectedOutcome

                  return (
                    <Stack
                      key={outcome}
                      data-swipe-column={isThrown ? undefined : slotIndex}
                      data-swipe-outcome={isThrown ? undefined : outcome}
                      gap={0}
                    >
                      <VisitDartSlotCard
                        label={isSelected ? OUTCOME_LABELS[outcome] : null}
                        variant={isSelected ? 'thrown' : 'empty'}
                        tone={isSelected ? toneForOutcome(outcome) : 'neutral'}
                        size={getOutcomeSlotSize(outcome, hasTriple)}
                        showArrow={false}
                      />
                    </Stack>
                  )
                })}
              </Stack>
            )
          }

          return (
            <Stack key={slotIndex} gap={2}>
              {displayOutcomes.map((outcome) => {
                const showActiveChrome = tapTarget || isAvailableColumn

                return (
                  <Stack
                    key={outcome}
                    data-swipe-column={slotIndex}
                    data-swipe-outcome={outcome}
                    gap={0}
                  >
                    <VisitDartSlotCard
                      label={OUTCOME_LABELS[outcome]}
                      variant={showActiveChrome ? 'selectable' : 'empty'}
                      tone={showActiveChrome ? toneForOutcome(outcome) : 'neutral'}
                      size={getOutcomeSlotSize(outcome, hasTriple)}
                      showArrow={false}
                      disabled={!tapTarget}
                      ariaLabel={`${OUTCOME_LABELS[outcome]} on dart ${slotIndex + 1}`}
                      onClick={
                        tapTarget
                          ? () => {
                              handleSlotClick(outcome)
                            }
                          : undefined
                      }
                    />
                  </Stack>
                )
              })}
            </Stack>
          )
        })}
      </Grid>

      <PressScaleButton
        variant="cta"
        {...scoringActionTypeProps}
        disabled={undoDisabled}
        onClick={onUndo}
      >
        Undo last dart
      </PressScaleButton>
    </Stack>
  )
}
