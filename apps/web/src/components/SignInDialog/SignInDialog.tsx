import { Button, Dialog, Input, Portal, Stack, Text } from '@chakra-ui/react'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useAuth } from '../../hooks/authContext'
import { darkDialogContentProps } from '../darkDialogContentProps'

export interface SignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SignInDialog = ({ open, onOpenChange }: SignInDialogProps) => {
  const { signInWithGoogle, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setSubmitting(true)
    const signInError = await signInWithGoogle()
    setSubmitting(false)
    setError(signInError)
  }

  const handleEmailSignIn = async (event: SyntheticEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const signInError = await signInWithEmail(email)
    setSubmitting(false)

    if (signInError === null) {
      setEmailSent(true)
      return
    }

    setError(signInError)
  }

  return (
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
            maxW="28rem"
          >
            <Dialog.Header>
              <Dialog.Title color="white">Save progress across devices</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Text fontSize="sm" color="whiteAlpha.800">
                  Sign in optionally to back up completed games and use your History and Stats on
                  another device.
                </Text>

                <Button
                  variant="emphasis"
                  disabled={submitting}
                  onClick={() => {
                    void handleGoogleSignIn()
                  }}
                >
                  <FontAwesomeIcon icon={faGoogle} aria-hidden />
                  Continue with Google
                </Button>

                <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
                  or use a magic link
                </Text>

                {emailSent ? (
                  <Text fontSize="sm" color="green.300">
                    Check your email for a sign-in link.
                  </Text>
                ) : (
                  <Stack
                    as="form"
                    gap={3}
                    onSubmit={(event) => {
                      void handleEmailSignIn(event)
                    }}
                  >
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                      }}
                      placeholder="you@example.com"
                      aria-label="Email address"
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.500' }}
                    />
                    <Button type="submit" variant="cta" disabled={submitting}>
                      Email me a sign-in link
                    </Button>
                  </Stack>
                )}

                {error !== null && (
                  <Text fontSize="sm" color="red.300">
                    {error}
                  </Text>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="cancel"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                Not now
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
