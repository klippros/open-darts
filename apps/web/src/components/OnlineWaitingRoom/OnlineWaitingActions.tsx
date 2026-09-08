import { Button, Stack } from '@chakra-ui/react'

export interface OnlineWaitingActionsProps {
  isCreator: boolean
  canBegin: boolean
  onBegin: () => void
  onLeaveOrCancel: () => void
  leaveLabel: string
}

export const OnlineWaitingActions = ({
  isCreator,
  canBegin,
  onBegin,
  onLeaveOrCancel,
  leaveLabel,
}: OnlineWaitingActionsProps) => (
  <Stack gap={3}>
    {isCreator && (
      <Button variant="emphasis" disabled={!canBegin} onClick={onBegin}>
        Begin match
      </Button>
    )}
    <Button variant="cancel" onClick={onLeaveOrCancel}>
      {leaveLabel}
    </Button>
  </Stack>
)
