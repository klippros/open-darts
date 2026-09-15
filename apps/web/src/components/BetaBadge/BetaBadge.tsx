import { Box } from '@chakra-ui/react'

export interface BetaBadgeProps {
  size?: 'sm' | 'md'
}

export const BetaBadge = ({ size = 'sm' }: BetaBadgeProps) => (
  <Box
    as="span"
    display="inline-flex"
    alignItems="center"
    borderRadius="full"
    bg="orange.400"
    color="black"
    fontFamily="Archivo Black, sans-serif"
    fontSize={size === 'sm' ? '0.625rem' : '0.75rem'}
    letterSpacing="0.06em"
    lineHeight="1"
    px={size === 'sm' ? 1.5 : 2}
    py={size === 'sm' ? 0.5 : 1}
    flexShrink={0}
  >
    BETA
  </Box>
)
