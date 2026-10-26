import { Stack } from '@chakra-ui/react'
import { PressScaleButton } from '../PressScaleButton/PressScaleButton'

export interface SetupPageActionsProps {
  backLabel?: string
  primaryLabel: string
  primaryDisabled?: boolean
  onBack: () => void
  onPrimary: () => void
}

export const SetupPageActions = ({
  backLabel = 'Back',
  primaryLabel,
  primaryDisabled = false,
  onBack,
  onPrimary,
}: SetupPageActionsProps) => (
  <Stack direction="row" justify="space-between" w="full" gap={3}>
    <PressScaleButton variant="cancel" onClick={onBack}>
      {backLabel}
    </PressScaleButton>
    <PressScaleButton variant="emphasis" disabled={primaryDisabled} onClick={onPrimary}>
      {primaryLabel}
    </PressScaleButton>
  </Stack>
)
