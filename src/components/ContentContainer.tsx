import { Box, type BoxProps } from '@chakra-ui/react'
import { mainContentMaxWidth } from '../layout'

export const ContentContainer = ({ children, ...props }: BoxProps) => (
  <Box maxW={mainContentMaxWidth} mx="auto" px={6} w="full" {...props}>
    {children}
  </Box>
)
