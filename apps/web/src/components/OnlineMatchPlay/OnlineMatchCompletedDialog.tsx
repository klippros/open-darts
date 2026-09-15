import { Button, Dialog } from '@chakra-ui/react'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { Link as RouterLink } from 'react-router-dom'
import { getMatchSummary } from '../../lib/history/sessionSummary'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { MatchSummaryBody } from '../SessionSummary/MatchSummaryBody'
import { MatchSummaryTitle } from '../SessionSummary/MatchSummaryTitle'

export interface OnlineMatchCompletedDialogProps {
  open: boolean
  session: GameSession
}

export const OnlineMatchCompletedDialog = ({ open, session }: OnlineMatchCompletedDialogProps) => {
  if (!open) {
    return null
  }

  const summary = getMatchSummary(session)

  return (
    <Dialog.Root open placement="center" closeOnInteractOutside={false} closeOnEscape={false}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          bg={darkDialogContentProps.bg}
          borderWidth={darkDialogContentProps.borderWidth}
          borderColor={darkDialogContentProps.borderColor}
          color={darkDialogContentProps.color}
          shadow={darkDialogContentProps.shadow}
          w="full"
          maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem' }}
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
            <Button asChild variant="emphasis" w="full">
              <RouterLink to="/">Back home</RouterLink>
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
