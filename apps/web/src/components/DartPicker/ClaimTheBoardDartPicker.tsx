import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { buildClaimTheBoardDartsForHitCount } from '@open-darts/game/claimTheBoard/buildClaimTheBoardDarts'
import type { ClaimTheBoardHitCount } from '@open-darts/game/claimTheBoard/buildClaimTheBoardDarts'
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

const HIT_COUNTS: ClaimTheBoardHitCount[] = [0, 1, 2, 3]

export const ClaimTheBoardDartPicker = ({
  targetIndex,
  aimMode,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: ClaimTheBoardDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const target = getClaimTheBoardTarget(targetIndex, aimMode)

  return (
    <Stack gap={3}>
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        {HIT_COUNTS.map((hitCount) => (
          <VisitDartSlotCard
            key={hitCount}
            label={String(hitCount)}
            variant={inputDisabled ? 'empty' : 'selectable'}
            tone={hitCount === 0 ? 'red' : 'green'}
            size="comfortable"
            showArrow={false}
            disabled={inputDisabled}
            ariaLabel={
              hitCount === 0
                ? `No hits on ${target.label}`
                : `Hit ${target.label} ${hitCount} time${hitCount === 1 ? '' : 's'}`
            }
            onClick={
              inputDisabled
                ? undefined
                : () => {
                    if (hitCount === 0) {
                      playMiss()
                    } else {
                      playHit()
                    }
                    onDarts(buildClaimTheBoardDartsForHitCount(hitCount, targetIndex, aimMode))
                  }
            }
          />
        ))}
      </Grid>

      <Button variant="cta" disabled={undoDisabled} onClick={onUndo}>
        Undo visit
      </Button>
    </Stack>
  )
}
