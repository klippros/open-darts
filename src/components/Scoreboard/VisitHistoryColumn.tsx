import { Box, Stack, Text } from '@chakra-ui/react'
import { formatDart } from '../../lib/formatDart'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'

export interface VisitHistoryColumnProps {
  player: Player
  visits: Visit[]
  align?: 'left' | 'right'
}

export const VisitHistoryColumn = ({ player, visits, align = 'left' }: VisitHistoryColumnProps) => {
  const playerVisits = visits.filter((visit) => visit.playerId === player.id).toReversed()

  return (
    <Stack
      gap={3}
      align={align === 'right' ? 'flex-end' : 'flex-start'}
      display={{ base: 'none', lg: 'flex' }}
    >
      <Text fontSize="xs" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="0.08em">
        {player.name}
      </Text>

      {playerVisits.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.400">
          No visits yet
        </Text>
      ) : (
        playerVisits.map((visit) => (
          <Box
            key={visit.visitIndex}
            w="full"
            maxW="200px"
            px={3}
            py={2}
            borderRadius="12px"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.50"
            textAlign={align === 'right' ? 'right' : 'left'}
          >
            <Text color="white" fontWeight="bold" fontSize="lg">
              {visit.bust ? 'BUST' : visit.visitScore}
            </Text>
            <Text mt={1} color="whiteAlpha.700" fontSize="sm" lineHeight="short">
              {visit.darts.map((dart) => formatDart(dart)).join(' · ')}
            </Text>
          </Box>
        ))
      )}
    </Stack>
  )
}
