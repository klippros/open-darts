import { Button, Grid, Stack } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'

export interface TenUpOneDownDartPickerProps {
  checkoutTarget: number
  onVisitScore: (score: number) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

export const TenUpOneDownDartPicker = ({
  checkoutTarget,
  onVisitScore,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: TenUpOneDownDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const cardVariant = inputDisabled ? 'empty' : 'selectable'

  return (
    <Stack gap={3}>
      <Grid templateColumns="repeat(2, 1fr)" gap={3}>
        <VisitDartSlotCard
          label="Failed"
          variant={cardVariant}
          tone="red"
          size="comfortable"
          showArrow={false}
          disabled={inputDisabled}
          ariaLabel={`Failed checkout on ${checkoutTarget}`}
          onClick={
            inputDisabled
              ? undefined
              : () => {
                  playMiss()
                  onVisitScore(0)
                }
          }
        />
        <VisitDartSlotCard
          label="Checkout"
          variant={cardVariant}
          tone="green"
          size="comfortable"
          showArrow={false}
          disabled={inputDisabled}
          ariaLabel={`Checkout ${checkoutTarget}`}
          onClick={
            inputDisabled
              ? undefined
              : () => {
                  playHit()
                  onVisitScore(checkoutTarget)
                }
          }
        />
      </Grid>

      <Button variant="cta" disabled={undoDisabled} onClick={onUndo}>
        Undo visit
      </Button>
    </Stack>
  )
}
