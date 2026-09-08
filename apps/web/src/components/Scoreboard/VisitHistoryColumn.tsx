import { Box, Stack, Text } from '@chakra-ui/react'
import { formatDart } from '@open-darts/game/formatDart'
import { getVisitsForLeg } from '@open-darts/game/game/matchLegs'
import type { GameModeId } from '@open-darts/game/types/gameMode'
import type { Player } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { getVisitHistoryEntryDisplay, getVisitHistoryHeadlineColor } from './visitHistoryDisplay'
import { WaitingVisitHistoryCard } from './WaitingVisitHistoryCard'

export type VisitHistoryLayoutVariant = 'sidebar' | 'stack'

export interface VisitHistoryColumnProps {
  player: Player
  visits: Visit[]
  mode: GameModeId
  currentLeg?: number
  align?: 'left' | 'right'
  showPlayerName?: boolean
  variant?: VisitHistoryLayoutVariant
  showWaitingVisit?: boolean
}

export const VisitHistoryColumn = ({
  player,
  visits,
  mode,
  currentLeg,
  align = 'left',
  showPlayerName = true,
  variant = 'sidebar',
  showWaitingVisit = false,
}: VisitHistoryColumnProps) => {
  const legVisits = currentLeg === undefined ? visits : getVisitsForLeg(visits, currentLeg)
  const playerVisits = legVisits.filter((visit) => visit.playerId === player.id).toReversed()
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
      {playerVisits.length === 0 && !showWaitingVisit && (
        <Text fontSize="sm" color="whiteAlpha.400" textAlign={isRight ? 'right' : 'left'}>
          No visits yet
        </Text>
      )}
      {playerVisits.map((visit) => {
        const display = getVisitHistoryEntryDisplay(visit, mode)
        const headlineColor = getVisitHistoryHeadlineColor(display.tone)

        return (
          <Box
            key={visit.visitIndex}
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
            {visit.darts.length > 0 && (
              <Text mt={1} color="whiteAlpha.700" fontSize="sm" lineHeight="short">
                {visit.darts.map((dart) => formatDart(dart)).join(' · ')}
              </Text>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
