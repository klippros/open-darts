import { Button, Stack } from '@chakra-ui/react'

export interface OnlineWaitingActionsProps {
  isCreator: boolean
  canBegin: boolean
  canKick: boolean
  onBegin: () => void
  onKick: () => void
  onLeaveOrCancel: () => void
  leaveLabel: string
}

export const OnlineWaitingActions = ({
  isCreator,
  canBegin,
  canKick,
  onBegin,
  onKick,
  onLeaveOrCancel,
  leaveLabel,
}: OnlineWaitingActionsProps) => (
  <Stack gap={3}>
    {isCreator && (
      <Button variant="emphasis" disabled={!canBegin} onClick={onBegin}>
        Begin match
      </Button>
    )}
    {isCreator && canKick && (
      <Button variant="ghost" onClick={onKick}>
        Kick opponent
      </Button>
    )}
    <Button variant="cancel" onClick={onLeaveOrCancel}>
      {leaveLabel}
    </Button>
  </Stack>
)
