import { Badge, Stack, Text } from '@chakra-ui/react'
import type { MatchPlayerSnapshot } from '../../lib/matchServer/types'
import { MatchPlayerSlot } from '../../lib/matchServer/types'

export interface OnlineWaitingPlayerRowProps {
  player: MatchPlayerSnapshot
  isCreator: boolean
  isYou: boolean
  displayName: string
}

export const OnlineWaitingPlayerRow = ({
  player,
  isCreator,
  isYou,
  displayName,
}: OnlineWaitingPlayerRowProps) => (
  <Stack
    direction="row"
    align="center"
    justify="space-between"
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={4}
    py={3}
  >
    <Stack gap={0.5}>
      <Text color="white" fontWeight="semibold">
        {displayName}
        {isYou ? ' (you)' : ''}
      </Text>
      <Text color="whiteAlpha.600" fontSize="sm">
        {player.slot === MatchPlayerSlot.Creator || isCreator ? 'Host' : 'Guest'}
      </Text>
    </Stack>
    <Badge colorPalette={player.connected ? 'green' : 'gray'} variant="subtle">
      {player.connected ? 'Connected' : 'Away'}
    </Badge>
  </Stack>
)
