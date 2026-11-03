import { Dialog, Portal } from '@chakra-ui/react'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { getMatchSummary } from '../../lib/history/sessionSummary'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { MatchSummaryBody } from '../SessionSummary/MatchSummaryBody'
import { MatchSummaryTitle } from '../SessionSummary/MatchSummaryTitle'

export interface SessionSummaryDialogProps {
  open: boolean
  session: GameSession | null
  initialLegNumber?: number | null
  onClose: () => void
}

export const SessionSummaryDialog = ({
  open,
  session,
  initialLegNumber,
  onClose,
}: SessionSummaryDialogProps) => {
  if (session === null) {
    return null
  }

  const summary = getMatchSummary(session)

  return (
    <Dialog.Root
      open={open}
      placement="center"
      onOpenChange={(details) => {
        if (!details.open) {
          onClose()
        }
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
            w="full"
            maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem', lg: '42rem' }}
          >
            <Dialog.Header>
              <Dialog.Title color="white">
                <MatchSummaryTitle title={summary.title} />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <MatchSummaryBody session={session} initialLegNumber={initialLegNumber} />
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
