import { Button, Stack } from '@chakra-ui/react'

export interface SetupPageActionsProps {
  backLabel?: string
  primaryLabel: string
  onBack: () => void
  onPrimary: () => void
}

export const SetupPageActions = ({
  backLabel = 'Back',
  primaryLabel,
  onBack,
  onPrimary,
}: SetupPageActionsProps) => (
  <Stack direction="row" justify="space-between" w="full" gap={3}>
    <Button variant="cancel" onClick={onBack}>
      {backLabel}
    </Button>
    <Button variant="emphasis" onClick={onPrimary}>
      {primaryLabel}
    </Button>
  </Stack>
)
