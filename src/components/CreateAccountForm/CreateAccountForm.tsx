import { Button, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import type { CreateAccountInput } from '../../types/account'

export interface CreateAccountFormProps {
  submitLabel?: string
  cancelLabel?: string
  onSubmit: (input: CreateAccountInput) => string | null
  onCancel?: () => void
}

export const CreateAccountForm = ({
  submitLabel = 'Create account',
  cancelLabel = 'Not now',
  onSubmit,
  onCancel,
}: CreateAccountFormProps) => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const validationError = onSubmit({
      displayName,
      email: email.trim() === '' ? undefined : email,
    })

    if (validationError !== null) {
      setError(validationError)
      return
    }

    setError(null)
  }

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.800">
          Name
        </Text>
        <Input
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value)
          }}
          placeholder="Your name"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: 'whiteAlpha.500' }}
        />
      </Stack>

      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.800">
          Email (optional)
        </Text>
        <Input
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
          placeholder="you@example.com"
          type="email"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: 'whiteAlpha.500' }}
        />
      </Stack>

      {error !== null && (
        <Text fontSize="sm" color="red.300">
          {error}
        </Text>
      )}

      <Stack gap={3}>
        <Button variant="cta" onClick={handleSubmit}>
          {submitLabel}
        </Button>
        {onCancel !== undefined && (
          <Button variant="cancel" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
