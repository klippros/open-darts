import { Box, Button, Stack, Text } from '@chakra-ui/react'

export interface OnlineMatchCancelBannerProps {
  proposedByYou: boolean
  onAccept: () => void
  onWithdraw: () => void
  onPropose: () => void
  proposalOpen: boolean
}

export const OnlineMatchCancelBanner = ({
  proposedByYou,
  onAccept,
  onWithdraw,
  onPropose,
  proposalOpen,
}: OnlineMatchCancelBannerProps) => {
  if (!proposalOpen) {
    return (
      <Box px={6} pt={3}>
        <Button variant="ghost" size="sm" onClick={onPropose}>
          Propose cancel
        </Button>
      </Box>
    )
  }

  return (
    <Box
      mx={6}
      mt={3}
      borderWidth="1px"
      borderColor="orange.300"
      borderRadius="lg"
      bg="rgba(246, 173, 85, 0.14)"
      px={4}
      py={3}
    >
      <Stack
        direction={{ base: 'column', sm: 'row' }}
        align={{ sm: 'center' }}
        justify="space-between"
        gap={3}
      >
        <Text color="white" fontSize="sm">
          {proposedByYou
            ? 'You proposed cancelling this match.'
            : 'Your opponent proposed cancelling this match.'}
        </Text>
        {proposedByYou ? (
          <Button variant="ghost" size="sm" onClick={onWithdraw}>
            Withdraw
          </Button>
        ) : (
          <Button variant="emphasis" size="sm" onClick={onAccept}>
            Accept cancel
          </Button>
        )}
      </Stack>
    </Box>
  )
}
