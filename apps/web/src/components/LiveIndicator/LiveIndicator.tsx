import { Box } from '@chakra-ui/react'
import type { BoxProps } from '@chakra-ui/react'

export interface LiveIndicatorProps {
  show?: boolean
  top?: BoxProps['top']
  right?: BoxProps['right']
  bottom?: BoxProps['bottom']
  left?: BoxProps['left']
}

export const LiveIndicator = ({ show = true, top, right, bottom, left }: LiveIndicatorProps) => {
  if (!show) {
    return null
  }

  const hasCustomPosition =
    top !== undefined || right !== undefined || bottom !== undefined || left !== undefined

  return (
    <Box
      className="online-pulse-dot"
      position="absolute"
      top={hasCustomPosition ? top : 3}
      right={hasCustomPosition ? right : 3}
      bottom={bottom}
      left={left}
      w="8px"
      h="8px"
      borderRadius="full"
      bg="yellow.400"
      aria-hidden
    />
  )
}
