import type { ReactNode } from 'react'
import { Box, Stack, Text } from '@chakra-ui/react'
import { BetaBadge } from '../BetaBadge/BetaBadge'

export interface BetaBannerProps {
  title: string
  children: ReactNode
}

export const BetaBanner = ({ title, children }: BetaBannerProps) => (
  <Box
    borderWidth="2px"
    borderColor="orange.300"
    borderRadius="xl"
    bg="linear-gradient(135deg, rgba(246, 173, 85, 0.18), rgba(246, 173, 85, 0.06))"
    px={{ base: 5, md: 6 }}
    py={{ base: 5, md: 6 }}
  >
    <Stack gap={3}>
      <Stack gap={2} direction="row" align="center">
        <BetaBadge size="md" />
        <Text
          color="orange.100"
          fontFamily="Archivo Black, sans-serif"
          fontSize={{ base: 'lg', md: 'xl' }}
          lineHeight="1.1"
        >
          {title}
        </Text>
      </Stack>
      <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65" maxW="56ch">
        {children}
      </Text>
    </Stack>
  </Box>
)
