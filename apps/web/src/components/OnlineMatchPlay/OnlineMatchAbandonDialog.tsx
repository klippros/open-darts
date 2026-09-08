import { Button, Dialog, Stack, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface OnlineMatchAbandonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const OnlineMatchAbandonDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: OnlineMatchAbandonDialogProps) => (
  <Dialog.Root
    open={open}
    onOpenChange={(details) => {
      onOpenChange(details.open)
    }}
    placement="center"
  >
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content
        bg={darkDialogContentProps.bg}
        borderWidth={darkDialogContentProps.borderWidth}
        borderColor={darkDialogContentProps.borderColor}
        color={darkDialogContentProps.color}
        shadow={darkDialogContentProps.shadow}
        w="full"
        maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem' }}
      >
        <Dialog.Header>
          <Dialog.Title color="white">Abandon match?</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text color="whiteAlpha.800" lineHeight="1.55">
            Leaving now counts as a loss for you and a win for your opponent.
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Stack direction="row" gap={3} w="full">
            <Button
              variant="cancel"
              flex="1"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Keep playing
            </Button>
            <Button
              variant="destructive"
              flex="1"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              Abandon
            </Button>
          </Stack>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
)
