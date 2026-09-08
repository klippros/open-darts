import { Box, Button, Stack, Text } from '@chakra-ui/react'

export interface OnlineMatchCancelBannerProps {
  proposedByYou: boolean
  onAccept: () => void
  onWithdraw: () => void
}

/** Shown only while a mutual-cancel proposal is open (accept / withdraw). */
export const OnlineMatchCancelBanner = ({
  proposedByYou,
  onAccept,
  onWithdraw,
}: OnlineMatchCancelBannerProps) => (
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
        <Button variant="cancel" size="sm" onClick={onWithdraw}>
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
