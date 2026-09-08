import { Button, Dialog, Stack, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface OnlineMatchAsyncPromptProps {
  open: boolean
  onWait: () => void
  onContinueAsync: () => void
}

export const OnlineMatchAsyncPrompt = ({
  open,
  onWait,
  onContinueAsync,
}: OnlineMatchAsyncPromptProps) => (
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
          <Dialog.Title color="white">Opponent inactive</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text color="whiteAlpha.800" lineHeight="1.55">
            Your opponent has been inactive. Keep waiting, or continue asynchronously with a 24-hour
            deadline for them to finish their visits.
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Stack direction={{ base: 'column', sm: 'row' }} gap={3} w="full">
            <Button variant="cancel" flex="1" onClick={onWait}>
              Wait
            </Button>
            <Button variant="emphasis" flex="1" onClick={onContinueAsync}>
              Continue asynchronously
            </Button>
          </Stack>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
)
