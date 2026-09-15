import { Flex, Spinner } from '@chakra-ui/react'

export type WaitingVisitHistoryCardVariant = 'sidebar' | 'stack'

export interface WaitingVisitHistoryCardProps {
  variant?: WaitingVisitHistoryCardVariant
}

export const WaitingVisitHistoryCard = ({ variant = 'sidebar' }: WaitingVisitHistoryCardProps) => (
  <Flex
    w="full"
    maxW={variant === 'stack' ? 'full' : '200px'}
    px={3}
    py={3}
    minH="3.25rem"
    borderRadius="12px"
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    bg="whiteAlpha.50"
    align="center"
    justify="center"
    role="status"
  >
    <Spinner size="sm" color="whiteAlpha.800" borderWidth="2px" aria-label="Waiting for opponent" />
  </Flex>
)
