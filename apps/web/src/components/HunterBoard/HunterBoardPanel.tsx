import { Box, Flex, HStack, Stack, Text } from '@chakra-ui/react'
import type { ScoreboardPlayerEntry } from '@open-darts/game/game/GameEngine'
import type { Visit } from '@open-darts/game/types/visit'
import {
  advanceHunterFieldIndex,
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
} from '@open-darts/game/hunter/hunterClock'
import { formatCount, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeHunterPlayerStats } from '../../lib/hunter/hunterVisitStats'
import {
  DARTBOARD_CENTER,
  DARTBOARD_FONT_FAMILY,
  DARTBOARD_NUMBERS,
  DARTBOARD_OUTER_RADIUS,
  DARTBOARD_SEGMENT_ROTATION,
  DARTBOARD_TEXT_CLASS,
  DARTBOARD_VIEWBOX_SIZE,
  describeRingSegment,
  getSegmentAngles,
  polarToCartesian,
  toBoardWorldPoint,
} from '../DartPicker/dartboardLayout'

export interface HunterBoardPanelProps {
  players: ScoreboardPlayerEntry[]
  visits: Visit[]
}

const HUNTER_PLAYER_COLORS = ['#2dd4bf', '#fbbf24'] as const
const HUNTER_DANGER_FLASH_COLOR = '#ef4444'

const SEGMENT_INNER_RADIUS = 0
const BASE_SEGMENT_DARK = '#1a1a1a'
const BASE_SEGMENT_LIGHT = '#2e2a28'
const AIM_FLASH_ACTIVE_CLASS = 'hunter-aim-flash-active'

const getBaseSegmentFill = (segmentIndex: number): string =>
  segmentIndex % 2 === 0 ? BASE_SEGMENT_DARK : BASE_SEGMENT_LIGHT

/** Field the player stands on = one step before the number they are aiming at. */
const getStandingFieldNumber = (aimFieldNumber: number): number =>
  getHunterFieldNumber(advanceHunterFieldIndex(getHunterFieldIndexForNumber(aimFieldNumber), -1))

/** Keep labels at the old ring mid-band, even though wedges reach the center. */
const NUMBER_LABEL_INNER_RADIUS = 52
const NUMBER_LABEL_RADIUS =
  NUMBER_LABEL_INNER_RADIUS + (DARTBOARD_OUTER_RADIUS - NUMBER_LABEL_INNER_RADIUS) * 0.62

interface SegmentMark {
  color: string
  isActive: boolean
}

interface HunterPlayerSideStatsProps {
  player: ScoreboardPlayerEntry
  color: string
  visits: Visit[]
  align: 'start' | 'end'
}

const HunterPlayerSideStats = ({ player, color, visits, align }: HunterPlayerSideStatsProps) => {
  const stats = computeHunterPlayerStats(visits, player.playerId)
  const aimFieldNumber = player.primaryScore
  const standingFieldNumber = getStandingFieldNumber(aimFieldNumber)
  const textAlign = align === 'start' ? 'left' : 'right'

  return (
    <Stack
      gap={1}
      flex="1 1 0"
      minW={0}
      w={{ base: 'auto', sm: '120px' }}
      flexGrow={{ base: 1, sm: 0 }}
      flexShrink={{ base: 1, sm: 0 }}
      flexBasis={{ base: 0, sm: '120px' }}
      opacity={player.isActive ? 1 : 0.65}
      textAlign={textAlign}
      align={align === 'start' ? 'flex-start' : 'flex-end'}
    >
      <HStack gap={2} flexDirection={align === 'end' ? 'row-reverse' : 'row'}>
        <Box w="10px" h="10px" borderRadius="full" bg={color} flexShrink={0} />
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={player.isActive ? color : 'white'}
          truncate
          maxW="100%"
        >
          {player.name}
        </Text>
      </HStack>
      <Text fontSize="xs" color="whiteAlpha.700">
        On {standingFieldNumber} · hit {aimFieldNumber}
      </Text>
      <Text fontSize="xs" color="whiteAlpha.800">
        Hit {formatPercent(stats.hitRate)}
      </Text>
      <Text fontSize="xs" color="whiteAlpha.800">
        {formatCount(stats.avgAdvancesPerVisit)} adv/visit
      </Text>
    </Stack>
  )
}

export const HunterBoardPanel = ({ players, visits }: HunterBoardPanelProps) => {
  const standingByNumber = new Map<number, SegmentMark>()
  const aimByNumber = new Map<number, SegmentMark>()
  const activePlayer = players.find((player) => player.isActive)
  const opponent = players.find((player) => !player.isActive)
  const opponentStandingField =
    opponent === undefined ? null : getStandingFieldNumber(opponent.primaryScore)
  const leftPlayer = players[0]
  const rightPlayer = players[1]

  players.forEach((player, index) => {
    const color =
      HUNTER_PLAYER_COLORS[index % HUNTER_PLAYER_COLORS.length] ?? HUNTER_PLAYER_COLORS[0]
    const aimFieldNumber = player.primaryScore
    const standingFieldNumber = getStandingFieldNumber(aimFieldNumber)

    standingByNumber.set(standingFieldNumber, { color, isActive: player.isActive })
  })

  if (activePlayer !== undefined) {
    const activeIndex = players.findIndex((player) => player.playerId === activePlayer.playerId)
    const playerColor =
      HUNTER_PLAYER_COLORS[activeIndex % HUNTER_PLAYER_COLORS.length] ?? HUNTER_PLAYER_COLORS[0]
    const aimingAtOpponent =
      opponentStandingField !== null && activePlayer.primaryScore === opponentStandingField

    aimByNumber.set(activePlayer.primaryScore, {
      color: aimingAtOpponent ? HUNTER_DANGER_FLASH_COLOR : playerColor,
      isActive: true,
    })
  }

  const board = (
    <Box flex="1 1 auto" minW={0} w="full">
      <svg
        viewBox={`0 0 ${DARTBOARD_VIEWBOX_SIZE} ${DARTBOARD_VIEWBOX_SIZE}`}
        width="100%"
        role="img"
        aria-label="Hunter board positions"
      >
        <defs>
          <style>
            {`
              .${DARTBOARD_TEXT_CLASS} {
                font-family: ${DARTBOARD_FONT_FAMILY};
                font-weight: 900;
              }

              @keyframes hunter-aim-flash {
                0%, 49% { opacity: 1; }
                50%, 100% { opacity: 0; }
              }

              .${AIM_FLASH_ACTIVE_CLASS} {
                animation: hunter-aim-flash 0.7s steps(1, end) infinite;
              }
            `}
          </style>
        </defs>

        <g
          transform={`rotate(${DARTBOARD_SEGMENT_ROTATION}, ${DARTBOARD_CENTER}, ${DARTBOARD_CENTER})`}
        >
          {DARTBOARD_NUMBERS.map((number, segmentIndex) => {
            const { start, end } = getSegmentAngles(segmentIndex)
            const standing = standingByNumber.get(number)
            const aim = aimByNumber.get(number)
            const path = describeRingSegment(
              DARTBOARD_CENTER,
              DARTBOARD_CENTER,
              SEGMENT_INNER_RADIUS,
              DARTBOARD_OUTER_RADIUS,
              start,
              end,
            )
            const baseFill = standing?.color ?? getBaseSegmentFill(segmentIndex)

            return (
              <g key={number}>
                <path d={path} fill={baseFill} />
                {aim !== undefined && (
                  <path
                    className={AIM_FLASH_ACTIVE_CLASS}
                    d={path}
                    fill={aim.color}
                    fillOpacity={0.45}
                  />
                )}
              </g>
            )
          })}
        </g>

        {DARTBOARD_NUMBERS.map((number, segmentIndex) => {
          const { mid } = getSegmentAngles(segmentIndex)
          const localPosition = polarToCartesian(
            DARTBOARD_CENTER,
            DARTBOARD_CENTER,
            NUMBER_LABEL_RADIUS,
            mid,
          )
          const labelPosition = toBoardWorldPoint(localPosition.x, localPosition.y)

          return (
            <text
              key={`label-${number}`}
              x={labelPosition.x}
              y={labelPosition.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f5f5f5"
              fontSize={14}
              className={DARTBOARD_TEXT_CLASS}
              style={{ pointerEvents: 'none' }}
            >
              {number}
            </text>
          )
        })}
      </svg>
    </Box>
  )

  const leftStats =
    leftPlayer === undefined ? null : (
      <HunterPlayerSideStats
        player={leftPlayer}
        color={HUNTER_PLAYER_COLORS[0]}
        visits={visits}
        align="start"
      />
    )

  const rightStats =
    rightPlayer === undefined ? null : (
      <HunterPlayerSideStats
        player={rightPlayer}
        color={HUNTER_PLAYER_COLORS[1]}
        visits={visits}
        align="end"
      />
    )

  return (
    <Flex
      direction="column"
      align="stretch"
      gap={4}
      px={{ base: 3, sm: 4 }}
      py={{ base: 3, sm: 4 }}
      borderRadius="16px"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="whiteAlpha.50"
      w="full"
    >
      {/* Board on top; players flank it on wider screens. */}
      <Flex display={{ base: 'none', sm: 'flex' }} align="flex-start" gap={4} w="full">
        {leftStats}
        {board}
        {rightStats}
      </Flex>

      <Flex
        display={{ base: 'flex', sm: 'none' }}
        direction="column"
        align="center"
        gap={4}
        w="full"
      >
        {board}
        <Flex align="flex-start" justify="space-between" gap={4} w="full">
          {leftStats}
          {rightStats}
        </Flex>
      </Flex>
    </Flex>
  )
}
