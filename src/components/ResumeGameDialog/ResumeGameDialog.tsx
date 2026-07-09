import { Button, Dialog, Text } from '@chakra-ui/react'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { gameModeDefinitions } from '../../lib/game/gameModeDefinitions'
import type { GameSession } from '../../types/gameSession'

export interface ResumeGameDialogProps {
  open: boolean
  savedSession: GameSession
  onResumeSaved: () => void
  onStartNew: () => void
}

export const ResumeGameDialog = ({
  open,
  savedSession,
  onResumeSaved,
  onStartNew,
}: ResumeGameDialogProps) => {
  const modeLabel = gameModeDefinitions[savedSession.mode].label

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
        >
          <Dialog.Header>
            <Dialog.Title color="white">Resume saved game?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
              You have a saved {modeLabel} game in progress. Starting this game will discard that
              progress.
            </Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="cta" onClick={onResumeSaved}>
              Resume {modeLabel}
            </Button>
            <Button variant="destructive" onClick={onStartNew}>
              Start new game
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
