import { Grid, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { VisitDartSlotCard } from '../../Scoreboard/VisitDartSlotCard'
import { PressScaleButton } from '../../PressScaleButton/PressScaleButton'
import { scoringActionTypeProps } from '../../../scoringType'
import { useUiSounds } from '../../../hooks/useUiSounds'
import {
  getHunterAimFieldNumberAfterDarts,
  getHunterPickerOutcomes,
  HUNTER_MAX_DARTS_PER_VISIT,
} from '@open-darts/game/hunter/hunterRules'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import type { DartThrow } from '@open-darts/game/types/dart'
import { HUNTER_OUTCOME_LABELS, getHunterThrownOutcome } from '../../../lib/hunter/hunterVisitStats'
import { useVisitOutcomeSwipe } from '../visitOutcomeSwipe/useVisitOutcomeSwipe'
import { buildHunterThrowsForOutcomes } from './buildHunterThrowsForOutcomes'

export interface HunterDartPickerProps {
  /** Committed field number at the start of the visit (before pending darts). */
  committedFieldNumber: number
  pendingDarts: DartThrow[]
  /** Append only new darts — must not re-send already pending throws. */
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

const reverseForDisplay = <T,>(items: T[]): T[] => [...items].reverse()

const SWIPE_OUTCOMES = new Set<string>(Object.values(HunterOutcome))

const isSwipeOutcome = (value: string): value is HunterOutcome => SWIPE_OUTCOMES.has(value)

const parseOutcome = (value: string): HunterOutcome | null => (isSwipeOutcome(value) ? value : null)

const toneForOutcome = (outcome: HunterOutcome): 'red' | 'green' =>
  outcome === HunterOutcome.Miss ? 'red' : 'green'

const getOutcomeSlotSize = (outcome: HunterOutcome): 'comfortable' | 'comfortableHalf' =>
  outcome === HunterOutcome.Double || outcome === HunterOutcome.Triple
    ? 'comfortableHalf'
    : 'comfortable'

export const HunterDartPicker = ({
  committedFieldNumber,
  pendingDarts,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: HunterDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const outcomes = getHunterPickerOutcomes()
  const displayOutcomes = reverseForDisplay(outcomes)
  const pendingCount = pendingDarts.length
  const aimFieldNumber = getHunterAimFieldNumberAfterDarts(committedFieldNumber, pendingDarts)

  const recordOutcomes = useCallback(
    (resolved: HunterOutcome[]) => {
      if (inputDisabled || resolved.length === 0) {
        return
      }

      const remaining = HUNTER_MAX_DARTS_PER_VISIT - pendingCount
      const toRecord = resolved.slice(0, Math.max(0, remaining))

      if (toRecord.length === 0) {
        return
      }

      if (toRecord.every((outcome) => outcome === HunterOutcome.Miss)) {
        playMiss()
      } else {
        playHit()
      }

      onDarts(buildHunterThrowsForOutcomes(toRecord, aimFieldNumber))
    },
    [aimFieldNumber, inputDisabled, onDarts, pendingCount, playHit, playMiss],
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
    visitDartCount: HUNTER_MAX_DARTS_PER_VISIT,
    inputDisabled,
    onCommit: recordOutcomes,
  })

  return (
    <Stack gap={3}>
      <Grid
        ref={gridRef}
        templateColumns={`repeat(${HUNTER_MAX_DARTS_PER_VISIT}, 1fr)`}
        gap={3}
        touchAction="none"
        {...gridPointerProps}
      >
        {Array.from({ length: HUNTER_MAX_DARTS_PER_VISIT }, (_, slotIndex) => {
          const isThrown = slotIndex < pendingCount
          const tapTarget = isTapTarget(slotIndex)
          const previewOutcome = previewForColumn(slotIndex)
          const isAvailableColumn = availableColumn === slotIndex
          const thrownDart = pendingDarts[slotIndex]
          const slotAimField = getHunterAimFieldNumberAfterDarts(
            committedFieldNumber,
            pendingDarts.slice(0, slotIndex),
          )
          const thrownOutcome =
            thrownDart === undefined ? null : getHunterThrownOutcome(thrownDart, slotAimField)
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
                        label={isSelected ? HUNTER_OUTCOME_LABELS[outcome] : null}
                        variant={isSelected ? 'thrown' : 'empty'}
                        tone={isSelected ? toneForOutcome(outcome) : 'neutral'}
                        size={getOutcomeSlotSize(outcome)}
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
                      label={HUNTER_OUTCOME_LABELS[outcome]}
                      variant={showActiveChrome ? 'selectable' : 'empty'}
                      tone={showActiveChrome ? toneForOutcome(outcome) : 'neutral'}
                      size={getOutcomeSlotSize(outcome)}
                      showArrow={false}
                      disabled={!tapTarget}
                      ariaLabel={`${HUNTER_OUTCOME_LABELS[outcome]} on ${aimFieldNumber}, dart ${slotIndex + 1}`}
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
