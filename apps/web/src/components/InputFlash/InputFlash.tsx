import { Box, Stack, Text } from '@chakra-ui/react'
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

/** Last line sits at the default score position; earlier lines stack above it. */
const splitFlashLines = (text: string): { prefixes: string[]; action: string } => {
  const lines = text.split('\n').filter((line) => line.length > 0)
  const action = lines.at(-1) ?? text

  return {
    prefixes: lines.slice(0, -1),
    action,
  }
}

export const InputFlash = ({ flash }: InputFlashProps) => {
  if (flash === null) {
    return null
  }

  const { prefixes, action } = splitFlashLines(flash.text)

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
        {prefixes.length > 0 ? (
          <Stack
            position="absolute"
            left="50%"
            bottom="100%"
            mb={1}
            transform="translateX(-50%)"
            align="center"
            gap={1}
          >
            {prefixes.map((line) => (
              <Text key={line} {...flashTypeProps}>
                {line}
              </Text>
            ))}
          </Stack>
        ) : null}
        <Text {...flashTypeProps}>{action}</Text>
      </Box>
    </Box>
  )
}
