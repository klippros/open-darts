import { Button, Dialog, Portal, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface SignOutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const SignOutConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: SignOutConfirmDialogProps) => (
  <Dialog.Root
    open={open}
    placement="center"
    onOpenChange={(details) => {
      onOpenChange(details.open)
    }}
  >
    <Portal>
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
            <Dialog.Title color="white">Sign out?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
              Synced completed games are removed from this device. Your account keeps them in the
              cloud, and in-progress games stay here. Sign back in anytime to restore your history.
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
              Sign out
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger />
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
)
