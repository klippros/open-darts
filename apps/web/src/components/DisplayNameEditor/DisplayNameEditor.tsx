import { Button, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DISPLAY_NAME_MAX_LENGTH, updateDisplayName } from '../../lib/profile/profileApi'
import type { DisplayNameUpdateError } from '../../lib/profile/profileApi'

export interface DisplayNameEditorProps {
  currentName: string
  onSaved: (nextName: string) => void
}

const errorMessage = (error: DisplayNameUpdateError): string => {
  if (error === 'length') {
    return `Use 1 to ${DISPLAY_NAME_MAX_LENGTH} characters.`
  }
  if (error === 'chars') {
    return 'Use letters and numbers.'
  }
  if (error === 'blocked') {
    return 'Choose a less offensive name.'
  }
  return 'Could not save the name. Try again.'
}

export const DisplayNameEditor = ({ currentName, onSaved }: DisplayNameEditorProps) => {
  const [value, setValue] = useState(currentName)
  const [error, setError] = useState<DisplayNameUpdateError | null>(null)
  const [saving, setSaving] = useState(false)

  const trimmed = value.trim().replace(/\s+/gu, ' ')
  const canSave =
    trimmed.length >= 1 &&
    trimmed.length <= DISPLAY_NAME_MAX_LENGTH &&
    trimmed !== currentName &&
    !saving

  return (
    <Stack gap={2}>
      <Text fontSize="sm" color="whiteAlpha.700">
        Display name (1–{DISPLAY_NAME_MAX_LENGTH} characters)
      </Text>
      <Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
        <Input
          value={value}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.300"
          color="white"
        />
        <Button
          variant="cta"
          disabled={!canSave}
          onClick={() => {
            void (async () => {
              setSaving(true)
              const result = await updateDisplayName(trimmed)
              setSaving(false)
              if (result === null) {
                onSaved(trimmed)
                setError(null)
                return
              }
              setError(result)
            })()
          }}
        >
          Save
        </Button>
      </Stack>
      {error !== null ? (
        <Text fontSize="sm" color="red.300">
          {errorMessage(error)}
        </Text>
      ) : null}
    </Stack>
  )
}
