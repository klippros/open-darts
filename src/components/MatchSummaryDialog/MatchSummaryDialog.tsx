import { Button, Dialog, Flex, Stack, Text } from '@chakra-ui/react'
import { faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { GameModeId } from '../../types/gameMode'
import type { Account, CreateAccountInput } from '../../types/account'
import type { GameSession } from '../../types/gameSession'
import { getMatchSummary, getSessionModeLabel } from '../../lib/history/sessionSummary'
import { saveStoredSession } from '../../lib/storage/gameStore'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SaveAccountDialog } from '../SaveAccountDialog/SaveAccountDialog'
import { MatchLegScore } from './MatchLegScore'
import { MatchStatsPanel } from './MatchStatsPanel'

export interface MatchSummaryDialogProps {
  open: boolean
  session: GameSession
  account: Account | null
  onPlayAgain: () => void
  onUndoLastDart: () => void
  onCreateAccount: (input: CreateAccountInput) => string | null
}

const showWinnerTrophy = (title: string): boolean =>
  title.endsWith(' wins') || title === 'Match won!' || title === 'Game shot!'

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
    setAccountDialogOpen(true)
  }

  const handleAccountSaved = () => {
    saveStoredSession(session)
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
            w="full"
            maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem', lg: '42rem' }}
          >
            <Dialog.Header>
              <Dialog.Title color="white">
                <Flex align="center" gap={2}>
                  {showWinnerTrophy(summary.title) && (
                    <FontAwesomeIcon icon={faTrophy} aria-hidden />
                  )}
                  {summary.title}
                </Flex>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={5}>
                {session.mode !== GameModeId.X01 && (
                  <>
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
                  </>
                )}

                {session.mode === GameModeId.X01 && (
                  <>
                    <MatchLegScore session={session} />
                    <MatchStatsPanel session={session} />
                  </>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Stack direction={{ base: 'column', sm: 'row' }} gap={3} w="full">
                <Button variant="ghost" flex="1" onClick={onUndoLastDart}>
                  Undo last dart
                </Button>
                {account === null && (
                  <Button variant="cta" flex="1" onClick={handleSaveResults}>
                    Save results
                  </Button>
                )}
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
