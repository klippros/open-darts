import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface PressScaleContentProps {
  children: ReactNode
  scale?: number
}

/** Visual layer that scales; keep pointer-events off so the parent owns the hit target. */
export const PressScaleContent = ({ children, scale = 1 }: PressScaleContentProps) => (
  <Box
    as="span"
    display="inline-flex"
    alignItems="center"
    justifyContent="center"
    flexDirection="column"
    w="full"
    maxW="full"
    pointerEvents="none"
    transform={`scale(${scale})`}
    transition="transform 0.15s ease"
    transformOrigin="center"
  >
    {children}
  </Box>
)
