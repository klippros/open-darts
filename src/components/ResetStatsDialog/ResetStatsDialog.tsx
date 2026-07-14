import { Button, Dialog, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface ResetStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const ResetStatsDialog = ({ open, onOpenChange, onConfirm }: ResetStatsDialogProps) => (
  <Dialog.Root
    open={open}
    placement="center"
    onOpenChange={(details) => {
      onOpenChange(details.open)
    }}
  >
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content
        bg={darkDialogContentProps.bg}
        borderWidth={darkDialogContentProps.borderWidth}
        borderColor={darkDialogContentProps.borderColor}
        color={darkDialogContentProps.color}
        shadow={darkDialogContentProps.shadow}
      >
        <Dialog.Header>
          <Dialog.Title color="white">Reset history and stats?</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
            Delete all saved games on this device? Your game history and stats will be permanently
            removed. This cannot be undone.
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.ActionTrigger asChild>
            <Button variant="cancel">Cancel</Button>
          </Dialog.ActionTrigger>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
            }}
          >
            Reset history and stats
          </Button>
        </Dialog.Footer>
        <Dialog.CloseTrigger />
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
)
