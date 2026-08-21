import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { buildBob27DartsForHitCount } from '../../lib/bob27/buildBob27Darts'
import type { Bob27HitCount } from '../../lib/bob27/buildBob27Darts'
import { getBob27Target } from '../../lib/bob27/bob27Rules'
import type { DartThrow } from '../../types/dart'

export interface Bob27DartPickerProps {
  targetIndex: number
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
}

const HIT_COUNTS: Bob27HitCount[] = [0, 1, 2, 3]

export const Bob27DartPicker = ({
  targetIndex,
  onDarts,
  onUndo,
  inputDisabled = false,
}: Bob27DartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const target = getBob27Target(targetIndex)

  return (
    <Stack gap={3}>
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        {HIT_COUNTS.map((hitCount) => (
          <VisitDartSlotCard
            key={hitCount}
            label={String(hitCount)}
            variant={inputDisabled ? 'empty' : 'selectable'}
            size="comfortable"
            showArrow={false}
            disabled={inputDisabled}
            ariaLabel={
              hitCount === 0
                ? `Miss all darts on ${target.label}`
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
                    onDarts(buildBob27DartsForHitCount(hitCount, targetIndex))
                  }
            }
          />
        ))}
      </Grid>

      <Button variant="cta" disabled={inputDisabled} onClick={onUndo}>
        Undo visit
      </Button>
    </Stack>
  )
}
