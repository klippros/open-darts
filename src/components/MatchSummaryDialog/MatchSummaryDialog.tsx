import { Button, Dialog, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../hooks/authContext'
import type { GameSession } from '../../types/gameSession'
import { getMatchSummary } from '../../lib/history/sessionSummary'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SignInDialog } from '../SignInDialog/SignInDialog'
import { MatchSummaryBody } from './MatchSummaryBody'
import { MatchSummaryTitle } from './MatchSummaryTitle'

export interface MatchSummaryDialogProps {
  open: boolean
  session: GameSession
  onPlayAgain: () => void
  onUndoLastDart: () => void
}

export const MatchSummaryDialog = ({
  open,
  session,
  onPlayAgain,
  onUndoLastDart,
}: MatchSummaryDialogProps) => {
  const { user, isConfigured } = useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)
  const summary = getMatchSummary(session)
  const showSignIn = isConfigured && user === null

  return (
    <Dialog.Root
      open={open}
      placement="center"
      closeOnInteractOutside={false}
      closeOnEscape={false}
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
          maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem', lg: '42rem' }}
        >
          <Dialog.Header>
            <Dialog.Title color="white">
              <MatchSummaryTitle title={summary.title} />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <MatchSummaryBody session={session} />
          </Dialog.Body>
          <Dialog.Footer>
            <Stack gap={3} w="full">
              <Stack direction={{ base: 'column', sm: 'row' }} gap={3} w="full">
                <Button variant="ghost" flex="1" onClick={onUndoLastDart}>
                  Undo last dart
                </Button>
                <Button variant="emphasis" flex="1" onClick={onPlayAgain}>
                  Play again
                </Button>
                <Button asChild variant="cancel" flex="1">
                  <RouterLink to="/">Finish</RouterLink>
                </Button>
              </Stack>
              {showSignIn && (
                <Button
                  variant="cta"
                  w="full"
                  onClick={() => {
                    setSignInDialogOpen(true)
                  }}
                >
                  Sign in to sync
                </Button>
              )}
            </Stack>
          </Dialog.Footer>
          <SignInDialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen} />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
