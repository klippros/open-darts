import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'

export type HitCount = 0 | 1 | 2 | 3

export interface HitCountDartPickerProps {
  targetLabel: string
  onHitCount: (hitCount: HitCount) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

const HIT_COUNTS: HitCount[] = [0, 1, 2, 3]

export const HitCountDartPicker = ({
  targetLabel,
  onHitCount,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: HitCountDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()

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
                ? `No hits on ${targetLabel}`
                : `Hit ${targetLabel} ${hitCount} time${hitCount === 1 ? '' : 's'}`
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
                    onHitCount(hitCount)
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
