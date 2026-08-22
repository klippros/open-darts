import { cloneElement } from 'react'
import { Box, HStack } from '@chakra-ui/react'
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useGameChrome } from '../../hooks/gameChromeContext'
import { useVoiceControl } from '../../hooks/voiceControlContext'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'

const resolveAriaLabel = (enabled: boolean, isError: boolean): string => {
  if (isError) {
    return 'Voice input unavailable — tap to retry'
  }

  if (enabled) {
    return 'Disable voice input'
  }

  return 'Enable voice input'
}

/** Microphone toggle available only while a match is active and recognition is supported. */
export const GameVoiceControl = () => {
  const gameChrome = useGameChrome()
  const { supported, enabled, status, toggle } = useVoiceControl()

  if (gameChrome?.active !== true || !gameChrome.voiceInputAvailable || !supported) {
    return null
  }

  const isError = status === 'denied' || status === 'failed'
  const isPaused = status === 'paused'
  const showLiveMic = enabled && !isError

  return (
    <Box opacity={isPaused ? 0.55 : 1}>
      {cloneElement(
        createToolbarIconButton(
          resolveAriaLabel(enabled, isError),
          <HStack gap={1} justify="center">
            <FontAwesomeIcon icon={showLiveMic ? faMicrophone : faMicrophoneSlash} />
          </HStack>,
        ),
        {
          onClick: () => {
            toggle()
          },
          color: isError ? 'red.300' : undefined,
        },
      )}
    </Box>
  )
}
