import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { buildNinetyNineDartsThrow } from '@open-darts/game/ninetyNineDarts/buildNinetyNineDarts'
import {
  getNinetyNineDartsOutcome,
  getNinetyNineDartsPickerOutcomes,
  NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
} from '@open-darts/game/ninetyNineDarts/ninetyNineDartsRules'
import { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '@open-darts/game/types/ninetyNineDarts'
import type { DartThrow } from '@open-darts/game/types/dart'

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
  [NinetyNineDartsOutcome.Triple]: 'Triple',
}

/** Picker outcomes are bottom→top; reverse for visual column (Double at top). */
const reverseForDisplay = <T,>(items: T[]): T[] => [...items].reverse()

const getOutcomeSlotSize = (
  outcome: NinetyNineDartsOutcome,
  hasTriple: boolean,
): 'comfortable' | 'comfortableHalf' =>
  hasTriple && outcome === NinetyNineDartsOutcome.Double ? 'comfortableHalf' : 'comfortable'

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

  const recordOutcome = (outcome: NinetyNineDartsOutcome) => {
    if (inputDisabled || pendingCount >= NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT) {
      return
    }

    if (outcome === NinetyNineDartsOutcome.Miss) {
      playMiss()
    } else {
      playHit()
    }

    onDarts([buildNinetyNineDartsThrow(outcome, target)])
  }

  return (
    <Stack gap={3}>
      <Grid templateColumns={`repeat(${NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT}, 1fr)`} gap={3}>
        {Array.from({ length: NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT }, (_, slotIndex) => {
          const isThrown = slotIndex < pendingCount
          const isSelectable = slotIndex === pendingCount && !inputDisabled
          const thrownDart = pendingDarts[slotIndex]
          const thrownOutcome =
            thrownDart === undefined ? null : getNinetyNineDartsOutcome(thrownDart, target)

          if (isThrown) {
            return (
              <Stack key={slotIndex} gap={2}>
                {displayOutcomes.map((outcome) => (
                  <VisitDartSlotCard
                    key={outcome}
                    label={outcome === thrownOutcome ? OUTCOME_LABELS[outcome] : null}
                    variant={outcome === thrownOutcome ? 'thrown' : 'empty'}
                    tone={
                      outcome === thrownOutcome
                        ? outcome === NinetyNineDartsOutcome.Miss
                          ? 'red'
                          : 'green'
                        : 'neutral'
                    }
                    size={getOutcomeSlotSize(outcome, hasTriple)}
                    showArrow={false}
                  />
                ))}
              </Stack>
            )
          }

          return (
            <Stack key={slotIndex} gap={2}>
              {displayOutcomes.map((outcome) => (
                <VisitDartSlotCard
                  key={outcome}
                  label={OUTCOME_LABELS[outcome]}
                  variant={isSelectable ? 'selectable' : 'empty'}
                  tone={
                    isSelectable
                      ? outcome === NinetyNineDartsOutcome.Miss
                        ? 'red'
                        : 'green'
                      : 'neutral'
                  }
                  size={getOutcomeSlotSize(outcome, hasTriple)}
                  showArrow={false}
                  disabled={!isSelectable}
                  ariaLabel={`${OUTCOME_LABELS[outcome]} on dart ${slotIndex + 1}`}
                  onClick={
                    isSelectable
                      ? () => {
                          recordOutcome(outcome)
                        }
                      : undefined
                  }
                />
              ))}
            </Stack>
          )
        })}
      </Grid>

      <Button variant="cta" disabled={undoDisabled} onClick={onUndo}>
        Undo last dart
      </Button>
    </Stack>
  )
}
