import { Box, Stack, Text } from '@chakra-ui/react'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { getAroundTheClockCompletedTargets } from '../../lib/aroundTheClock/aroundTheClockTargetHits'
import { getVisitsForLeg } from '@open-darts/game/game/matchLegs'
import type { AroundTheClockConfig } from '@open-darts/game/types/aroundTheClock'
import type { Player } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { WaitingVisitHistoryCard } from './WaitingVisitHistoryCard'

export type AroundTheClockHistoryLayoutVariant = 'sidebar' | 'stack'

export interface AroundTheClockHistoryColumnProps {
  player: Player
  visits: Visit[]
  config: AroundTheClockConfig
  currentLeg?: number
  align?: 'left' | 'right'
  showPlayerName?: boolean
  variant?: AroundTheClockHistoryLayoutVariant
  showWaitingVisit?: boolean
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
  variant = 'sidebar',
  showWaitingVisit = false,
}: AroundTheClockHistoryColumnProps) => {
  const legVisits = currentLeg === undefined ? visits : getVisitsForLeg(visits, currentLeg)
  const playerVisits = legVisits.filter((visit) => visit.playerId === player.id)
  const { aimMode } = getAroundTheClockConfig(config)
  const completedTargets = getAroundTheClockCompletedTargets(playerVisits, aimMode).toReversed()
  const isStack = variant === 'stack'
  const isRight = align === 'right'

  return (
    <Stack
      gap={3}
      align={isStack ? 'stretch' : isRight ? 'flex-end' : 'flex-start'}
      display={isStack ? 'flex' : { base: 'none', lg: 'flex' }}
      w={isStack ? 'full' : undefined}
    >
      {showPlayerName && (
        <Text
          fontSize="xs"
          color="whiteAlpha.500"
          textTransform="uppercase"
          letterSpacing="0.08em"
          textAlign={isRight ? 'right' : 'left'}
        >
          {player.name}
        </Text>
      )}

      {showWaitingVisit && <WaitingVisitHistoryCard variant={variant} />}
      {completedTargets.length === 0 && !showWaitingVisit && (
        <Text fontSize="sm" color="whiteAlpha.400" textAlign={isRight ? 'right' : 'left'}>
          No targets hit yet
        </Text>
      )}
      {completedTargets.map((target, index) => (
        <Box
          key={`${target.label}-${completedTargets.length - index}`}
          w="full"
          maxW={isStack ? 'full' : '200px'}
          px={3}
          py={2}
          borderRadius="12px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.50"
          textAlign={isRight ? 'right' : 'left'}
        >
          <Text color={getHeadlineColor(target.dartsToHit)} fontWeight="bold" fontSize="lg">
            {target.label}
          </Text>
          <Text mt={1} color="whiteAlpha.700" fontSize="sm" lineHeight="short">
            {getDartsLabel(target.dartsToHit)}
          </Text>
        </Box>
      ))}
    </Stack>
  )
}
