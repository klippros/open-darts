import { Button, Dialog, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { Account, CreateAccountInput } from '../../types/account'
import type { GameSession } from '../../types/gameSession'
import { getMatchSummary, getSessionModeLabel } from '../../lib/history/sessionSummary'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SaveAccountDialog } from '../SaveAccountDialog/SaveAccountDialog'

export interface MatchSummaryDialogProps {
  open: boolean
  session: GameSession
  account: Account | null
  onPlayAgain: () => void
  onUndoLastDart: () => void
  onCreateAccount: (input: CreateAccountInput) => string | null
}

export const MatchSummaryDialog = ({
  open,
  session,
  account,
  onPlayAgain,
  onUndoLastDart,
  onCreateAccount,
}: MatchSummaryDialogProps) => {
  const navigate = useNavigate()
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const summary = getMatchSummary(session)
  const modeLabel = getSessionModeLabel(session)

  useEffect(() => {
    if (open) {
      setAccountDialogOpen(false)
    }
  }, [open, session.id])

  const handleSaveResults = () => {
    if (account !== null) {
      void navigate('/history')
      return
    }

    setAccountDialogOpen(true)
  }

  const handleAccountSaved = () => {
    setAccountDialogOpen(false)
    void navigate('/history')
  }

  return (
    <>
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
          >
            <Dialog.Header>
              <Dialog.Title color="white">{summary.title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Text
                  fontSize="sm"
                  color="whiteAlpha.700"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                >
                  {modeLabel}
                </Text>

                <Stack gap={1}>
                  {summary.details.map((detail) => (
                    <Text key={detail} fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
                      {detail}
                    </Text>
                  ))}
                </Stack>

                <Button variant="ghost" size="sm" alignSelf="flex-start" onClick={onUndoLastDart}>
                  Undo last dart
                </Button>

                {account !== null && (
                  <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55">
                    Signed in as {account.displayName}.
                  </Text>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Stack direction={{ base: 'column', sm: 'row' }} gap={3} w="full">
                <Button variant="cta" flex="1" onClick={handleSaveResults}>
                  Save results
                </Button>
                <Button variant="emphasis" flex="1" onClick={onPlayAgain}>
                  Play again
                </Button>
                <Button asChild variant="cancel" flex="1">
                  <RouterLink to="/">Finish</RouterLink>
                </Button>
              </Stack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <SaveAccountDialog
        open={accountDialogOpen}
        onClose={() => {
          setAccountDialogOpen(false)
        }}
        onCreateAccount={onCreateAccount}
        onSuccess={handleAccountSaved}
      />
    </>
  )
}
