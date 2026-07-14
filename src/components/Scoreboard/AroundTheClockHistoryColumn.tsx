import { Box, Stack, Text } from '@chakra-ui/react'
import { getAroundTheClockConfig } from '../../lib/aroundTheClock/aroundTheClockConfig'
import { getAroundTheClockCompletedTargets } from '../../lib/aroundTheClock/aroundTheClockTargetHits'
import { getVisitsForLeg } from '../../lib/game/matchLegs'
import type { AroundTheClockConfig } from '../../types/aroundTheClock'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'

export interface AroundTheClockHistoryColumnProps {
  player: Player
  visits: Visit[]
  config: AroundTheClockConfig
  currentLeg?: number
  align?: 'left' | 'right'
  showPlayerName?: boolean
}

const getDartsLabel = (dartsToHit: number): string =>
  dartsToHit === 1 ? '1 dart' : `${dartsToHit} darts`

const getHeadlineColor = (dartsToHit: number): string =>
  dartsToHit === 1 ? 'green.300' : dartsToHit === 3 ? 'whiteAlpha.700' : 'white'

export const AroundTheClockHistoryColumn = ({
  player,
  visits,
  config,
  currentLeg,
  align = 'left',
  showPlayerName = true,
}: AroundTheClockHistoryColumnProps) => {
  const legVisits = currentLeg === undefined ? visits : getVisitsForLeg(visits, currentLeg)
  const playerVisits = legVisits.filter((visit) => visit.playerId === player.id)
  const { aimMode } = getAroundTheClockConfig(config)
  const completedTargets = getAroundTheClockCompletedTargets(playerVisits, aimMode).toReversed()

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

      {completedTargets.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.400">
          No targets hit yet
        </Text>
      ) : (
        completedTargets.map((target, index) => (
          <Box
            key={`${target.label}-${completedTargets.length - index}`}
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
            <Text color={getHeadlineColor(target.dartsToHit)} fontWeight="bold" fontSize="lg">
              {target.label}
            </Text>
            <Text mt={1} color="whiteAlpha.700" fontSize="sm" lineHeight="short">
              {getDartsLabel(target.dartsToHit)}
            </Text>
          </Box>
        ))
      )}
    </Stack>
  )
}
