import { Button, Dialog, Stack, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface OnlineMatchFinishPromptProps {
  open: boolean
  secondsLeft: number | null
  onFinish: () => void
  onUndo: () => void
}

export const OnlineMatchFinishPrompt = ({
  open,
  secondsLeft,
  onFinish,
  onUndo,
}: OnlineMatchFinishPromptProps) => (
  <Dialog.Root open={open} placement="center" closeOnInteractOutside={false} closeOnEscape={false}>
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
          <Dialog.Title color="white">Checkout</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Stack gap={2}>
            <Text color="whiteAlpha.800" lineHeight="1.55">
              The match is ready to finish. Confirm the result, or undo the last visit if something
              was wrong.
            </Text>
            {secondsLeft !== null && (
              <Text color="whiteAlpha.600" fontSize="sm">
                Auto-finalizes in {secondsLeft}s
              </Text>
            )}
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <Stack direction={{ base: 'column', sm: 'row' }} gap={3} w="full">
            <Button variant="ghost" flex="1" onClick={onUndo}>
              Undo last visit
            </Button>
            <Button variant="emphasis" flex="1" onClick={onFinish}>
              Finish match
            </Button>
          </Stack>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
)
