import { Box, Stack, Text } from '@chakra-ui/react'
import { formatDart } from '../../lib/formatDart'
import { getVisitsForLeg } from '../../lib/game/matchLegs'
import type { GameModeId } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import { getVisitHistoryEntryDisplay, getVisitHistoryHeadlineColor } from './visitHistoryDisplay'

export interface VisitHistoryColumnProps {
  player: Player
  visits: Visit[]
  mode: GameModeId
  currentLeg?: number
  align?: 'left' | 'right'
  showPlayerName?: boolean
}

export const VisitHistoryColumn = ({
  player,
  visits,
  mode,
  currentLeg,
  align = 'left',
  showPlayerName = true,
}: VisitHistoryColumnProps) => {
  const legVisits = currentLeg === undefined ? visits : getVisitsForLeg(visits, currentLeg)
  const playerVisits = legVisits.filter((visit) => visit.playerId === player.id).toReversed()

  return (
    <Stack
      gap={3}
      align={align === 'right' ? 'flex-end' : 'flex-start'}
      display={{ base: 'none', lg: 'flex' }}
    >
      {showPlayerName && (
        <Text fontSize="xs" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="0.08em">
          {player.name}
        </Text>
      )}

      {playerVisits.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.400">
          No visits yet
        </Text>
      ) : (
        playerVisits.map((visit) => {
          const display = getVisitHistoryEntryDisplay(visit, mode)
          const headlineColor = getVisitHistoryHeadlineColor(display.tone)

          return (
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
              {display.sublabel !== undefined && (
                <Text
                  color={headlineColor}
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                >
                  {display.sublabel}
                </Text>
              )}
              <Text color={headlineColor} fontWeight="bold" fontSize="lg">
                {display.headline}
              </Text>
              <Text mt={1} color="whiteAlpha.700" fontSize="sm" lineHeight="short">
                {visit.darts.map((dart) => formatDart(dart)).join(' · ')}
              </Text>
            </Box>
          )
        })
      )}
    </Stack>
  )
}
