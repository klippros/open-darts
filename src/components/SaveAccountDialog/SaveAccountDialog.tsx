import { Dialog, Text } from '@chakra-ui/react'
import type { CreateAccountInput } from '../../types/account'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { CreateAccountForm } from '../CreateAccountForm/CreateAccountForm'

export interface SaveAccountDialogProps {
  open: boolean
  onClose: () => void
  onCreateAccount: (input: CreateAccountInput) => string | null
  onSuccess: () => void
}

export const SaveAccountDialog = ({
  open,
  onClose,
  onCreateAccount,
  onSuccess,
}: SaveAccountDialogProps) => {
  const handleCreateAccount = (input: CreateAccountInput) => {
    const error = onCreateAccount(input)

    if (error === null) {
      onSuccess()
    }

    return error
  }

  return (
    <Dialog.Root
      open={open}
      placement="center"
      closeOnInteractOutside={false}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose()
        }
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
            <Dialog.Title color="white">Save your results</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55" mb={4}>
              Create a local profile to keep this game in your history on this device. No sign-up or
              server required.
            </Text>
            <CreateAccountForm
              submitLabel="Create account"
              cancelLabel="Cancel"
              onSubmit={handleCreateAccount}
              onCancel={onClose}
            />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
