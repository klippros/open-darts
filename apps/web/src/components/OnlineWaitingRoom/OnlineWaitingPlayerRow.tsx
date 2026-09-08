import { Badge, Button, Stack, Text } from '@chakra-ui/react'
import type { MatchPlayerSnapshot } from '../../lib/matchServer/types'
import { MatchPlayerSlot } from '../../lib/matchServer/types'

export interface OnlineWaitingPlayerRowProps {
  player: MatchPlayerSnapshot
  isCreator: boolean
  isYou: boolean
  displayName: string
  onKick?: () => void
}

export const OnlineWaitingPlayerRow = ({
  player,
  isCreator,
  isYou,
  displayName,
  onKick,
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
    gap={3}
  >
    <Stack gap={0.5} minW={0} flex="1">
      <Stack direction="row" align="center" gap={2} minW={0}>
        <Text color="white" fontWeight="semibold" truncate>
          {displayName}
          {isYou ? ' (you)' : ''}
        </Text>
        <Badge colorPalette={player.connected ? 'green' : 'gray'} variant="subtle" flexShrink={0}>
          {player.connected ? 'Connected' : 'Away'}
        </Badge>
      </Stack>
      <Text color="whiteAlpha.600" fontSize="sm">
        {player.slot === MatchPlayerSlot.Creator || isCreator ? 'Host' : 'Guest'}
      </Text>
    </Stack>
    {onKick !== undefined && (
      <Button variant="cancel" flexShrink={0} onClick={onKick}>
        Kick
      </Button>
    )}
  </Stack>
)
