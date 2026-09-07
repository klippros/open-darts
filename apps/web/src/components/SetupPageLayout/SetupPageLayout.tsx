import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { ContentContainer } from '../ContentContainer'

export interface SetupPageLayoutProps {
  children: ReactNode
  maxW?: '480px' | '560px'
}

export const SetupPageLayout = ({ children, maxW = '560px' }: SetupPageLayoutProps) => (
  <ContentContainer>
    <Box py={{ base: 6, md: 10 }} pb={10} maxW={maxW} w="full" mx="auto">
      {children}
    </Box>
  </ContentContainer>
)
