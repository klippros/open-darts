import { Box, Text } from '@chakra-ui/react'
import { DISPLAY_FONT_FAMILY } from '../../scoringType'
import type { InputFlashState } from '../../hooks/useInputFlash'

export interface InputFlashProps {
  flash: InputFlashState | null
}

const flashTypeProps = {
  fontFamily: DISPLAY_FONT_FAMILY,
  fontSize: '8xl',
  lineHeight: '1',
  letterSpacing: 'tight',
  color: 'white',
  textAlign: 'center',
  textShadow: '0 2px 18px rgba(0, 0, 0, 0.65)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
} as const

const undoActionLabel = (text: string): string => {
  const separator = text.indexOf(' ')

  if (separator < 0) {
    return text
  }

  return text.slice(separator + 1)
}

export const InputFlash = ({ flash }: InputFlashProps) => {
  if (flash === null) {
    return null
  }

  const actionText = flash.kind === 'undo' ? undoActionLabel(flash.text) : flash.text

  return (
    <Box
      key={flash.id}
      position="fixed"
      top="18%"
      left="50%"
      zIndex="toast"
      pointerEvents="none"
      className="input-flash"
    >
      <Box position="relative">
        {flash.kind === 'undo' ? (
          <Text
            {...flashTypeProps}
            position="absolute"
            left="50%"
            bottom="100%"
            mb={1}
            transform="translateX(-50%)"
          >
            Undo
          </Text>
        ) : null}
        <Text {...flashTypeProps}>{actionText}</Text>
      </Box>
    </Box>
  )
}
