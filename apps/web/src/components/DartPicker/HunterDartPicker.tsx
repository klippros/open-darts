import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { buildHunterThrow } from '@open-darts/game/hunter/buildHunterDarts'
import {
  getHunterAdvanceForDart,
  getHunterPickerOutcomes,
  HUNTER_MAX_DARTS_PER_VISIT,
} from '@open-darts/game/hunter/hunterRules'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import type { DartThrow } from '@open-darts/game/types/dart'
import {
  advanceHunterFieldIndex,
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
} from '@open-darts/game/hunter/hunterClock'
import { HUNTER_OUTCOME_LABELS, getHunterThrownOutcome } from '../../lib/hunter/hunterVisitStats'

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

const getAimFieldNumber = (committedFieldNumber: number, pendingDarts: DartThrow[]): number => {
  let fieldIndex = getHunterFieldIndexForNumber(committedFieldNumber)

  for (const dart of pendingDarts) {
    const fieldNumber = getHunterFieldNumber(fieldIndex)
    const advances = getHunterAdvanceForDart(dart, fieldNumber)
    fieldIndex = advanceHunterFieldIndex(fieldIndex, advances)
  }

  return getHunterFieldNumber(fieldIndex)
}

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
  const aimFieldNumber = getAimFieldNumber(committedFieldNumber, pendingDarts)

  const recordOutcome = (outcome: HunterOutcome) => {
    if (inputDisabled || pendingCount >= HUNTER_MAX_DARTS_PER_VISIT) {
      return
    }

    if (outcome === HunterOutcome.Miss) {
      playMiss()
    } else {
      playHit()
    }

    onDarts([buildHunterThrow(outcome, aimFieldNumber)])
  }

  return (
    <Stack gap={3}>
      <Grid templateColumns={`repeat(${HUNTER_MAX_DARTS_PER_VISIT}, 1fr)`} gap={3}>
        {Array.from({ length: HUNTER_MAX_DARTS_PER_VISIT }, (_, slotIndex) => {
          const isThrown = slotIndex < pendingCount
          const isSelectable = slotIndex === pendingCount && !inputDisabled
          const thrownDart = pendingDarts[slotIndex]
          const slotAimField = getAimFieldNumber(
            committedFieldNumber,
            pendingDarts.slice(0, slotIndex),
          )
          const thrownOutcome =
            thrownDart === undefined ? null : getHunterThrownOutcome(thrownDart, slotAimField)

          if (isThrown) {
            return (
              <Stack key={slotIndex} gap={2}>
                {displayOutcomes.map((outcome) => (
                  <VisitDartSlotCard
                    key={outcome}
                    label={outcome === thrownOutcome ? HUNTER_OUTCOME_LABELS[outcome] : null}
                    variant={outcome === thrownOutcome ? 'thrown' : 'empty'}
                    tone={
                      outcome === thrownOutcome
                        ? outcome === HunterOutcome.Miss
                          ? 'red'
                          : 'green'
                        : 'neutral'
                    }
                    size={
                      outcome === HunterOutcome.Double || outcome === HunterOutcome.Triple
                        ? 'comfortableHalf'
                        : 'comfortable'
                    }
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
                  label={HUNTER_OUTCOME_LABELS[outcome]}
                  variant={isSelectable ? 'selectable' : 'empty'}
                  tone={
                    isSelectable ? (outcome === HunterOutcome.Miss ? 'red' : 'green') : 'neutral'
                  }
                  size={
                    outcome === HunterOutcome.Double || outcome === HunterOutcome.Triple
                      ? 'comfortableHalf'
                      : 'comfortable'
                  }
                  showArrow={false}
                  disabled={!isSelectable}
                  ariaLabel={`${HUNTER_OUTCOME_LABELS[outcome]} on ${aimFieldNumber}, dart ${slotIndex + 1}`}
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
