import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { getAroundTheClockConfig } from '../../lib/aroundTheClock/aroundTheClockConfig'
import {
  buildDartsForMissAll,
  buildDartsForOrdinalHit,
  getAroundTheClockAvailableOrdinals,
  getAroundTheClockCurrentTargetIndex,
  getAroundTheClockDartsLeft,
  getAroundTheClockThrownSlotLabel,
} from '../../lib/aroundTheClock/buildAroundTheClockDarts'
import type { AroundTheClockDartOrdinal } from '../../lib/aroundTheClock/buildAroundTheClockDarts'
import { getAroundTheClockTargetAimLabel } from '../../lib/aroundTheClock/aroundTheClockRules'
import type { AroundTheClockConfig } from '../../types/aroundTheClock'
import type { DartThrow } from '../../types/dart'

export interface AroundTheClockDartPickerProps {
  committedTargetIndex: number
  pendingDarts: DartThrow[]
  config: AroundTheClockConfig
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
}

const ORDINAL_LABELS: Record<AroundTheClockDartOrdinal, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
}

const SLOT_ORDINALS: AroundTheClockDartOrdinal[] = [1, 2, 3]

export const AroundTheClockDartPicker = ({
  committedTargetIndex,
  pendingDarts,
  config,
  onDarts,
  onUndo,
  inputDisabled = false,
}: AroundTheClockDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const { aimMode } = getAroundTheClockConfig(config)
  const dartsLeft = getAroundTheClockDartsLeft(pendingDarts)
  const availableOrdinals = new Set(getAroundTheClockAvailableOrdinals(pendingDarts))
  const currentTargetLabel = getAroundTheClockTargetAimLabel(
    getAroundTheClockCurrentTargetIndex(committedTargetIndex, pendingDarts, aimMode),
    aimMode,
  )

  return (
    <Stack gap={3}>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        {SLOT_ORDINALS.map((ordinal, slotIndex) => {
          const isThrown = slotIndex < pendingDarts.length
          const isSelectable = !isThrown && availableOrdinals.has(ordinal)

          if (isThrown) {
            return (
              <VisitDartSlotCard
                key={ordinal}
                label={getAroundTheClockThrownSlotLabel(
                  committedTargetIndex,
                  pendingDarts,
                  aimMode,
                  slotIndex,
                )}
                variant="thrown"
                size="comfortable"
              />
            )
          }

          if (isSelectable) {
            return (
              <VisitDartSlotCard
                key={ordinal}
                label={currentTargetLabel}
                variant="selectable"
                size="comfortable"
                disabled={inputDisabled}
                ariaLabel={`Hit ${currentTargetLabel} on ${ORDINAL_LABELS[ordinal]} dart`}
                onClick={() => {
                  playHit()
                  onDarts(
                    buildDartsForOrdinalHit(ordinal, committedTargetIndex, pendingDarts, aimMode),
                  )
                }}
              />
            )
          }

          return <VisitDartSlotCard key={ordinal} label={null} variant="empty" size="comfortable" />
        })}
      </Grid>

      <VisitDartSlotCard
        label={dartsLeft === 1 ? 'Miss' : `Miss ${dartsLeft} darts`}
        variant={dartsLeft === 0 || inputDisabled ? 'empty' : 'selectable'}
        size="comfortable"
        disabled={inputDisabled || dartsLeft === 0}
        ariaLabel={dartsLeft === 1 ? 'Miss' : `Miss ${dartsLeft} darts`}
        onClick={
          dartsLeft === 0 || inputDisabled
            ? undefined
            : () => {
                playMiss()
                onDarts(buildDartsForMissAll(dartsLeft))
              }
        }
      />

      <Button variant="cta" disabled={inputDisabled} onClick={onUndo}>
        Undo last dart
      </Button>
    </Stack>
  )
}
