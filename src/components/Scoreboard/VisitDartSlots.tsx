import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatDart } from '../../lib/formatDart'
import {
  getVisitDartSlots,
  isBogeyCheckoutScore,
} from '../../lib/x01/x01CheckoutSuggestions'
import type { VisitDartSlotView } from '../../lib/x01/x01CheckoutSuggestions'
import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'

export interface VisitDartSlotsProps {
  pendingDarts: DartThrow[]
  config?: X01Config | null
  scoreBeforeVisit?: number
}

const SLOT_KEYS = ['first', 'second', 'third'] as const

const ArrowMark = () => (
  <Box aria-hidden="true" w="full" color="whiteAlpha.600" lineHeight={0}>
    <FontAwesomeIcon icon={faArrowRightLong} style={{ width: '100%', height: '1.1em' }} />
  </Box>
)

const getSlotStyles = (kind: VisitDartSlotView['kind']) => {
  if (kind === 'thrown') {
    return {
      borderColor: 'whiteAlpha.500',
      bg: 'whiteAlpha.200',
      opacity: 1,
    }
  }

  if (kind === 'suggested') {
    return {
      borderColor: 'whiteAlpha.200',
      bg: 'whiteAlpha.80',
      opacity: 0.55,
    }
  }

  return {
    borderColor: 'whiteAlpha.200',
    bg: 'whiteAlpha.50',
    opacity: 0.35,
  }
}

const getSimpleVisitDartSlots = (pendingDarts: DartThrow[]): VisitDartSlotView[] =>
  SLOT_KEYS.map((_, index) => {
    const thrown = pendingDarts[index]

    if (thrown !== undefined) {
      return {
        kind: 'thrown',
        label: formatDart(thrown),
      }
    }

    return { kind: 'empty', label: null }
  })

export const VisitDartSlots = ({
  pendingDarts,
  config = null,
  scoreBeforeVisit = 0,
}: VisitDartSlotsProps) => {
  const slots =
    config === null
      ? getSimpleVisitDartSlots(pendingDarts)
      : getVisitDartSlots(scoreBeforeVisit, pendingDarts, config)

  const thrownPoints = pendingDarts.reduce((total, dart) => total + dart.points, 0)
  const remaining = scoreBeforeVisit - thrownPoints
  const showBogey = config !== null && isBogeyCheckoutScore(remaining, config)

  return (
    <Stack gap={2}>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        {slots.map((slot, index) => {
          const styles = getSlotStyles(slot.kind)

          return (
            <Box
              key={SLOT_KEYS[index]}
              px={3}
              py={4}
              borderRadius="14px"
              borderWidth="1px"
              borderColor={styles.borderColor}
              bg={styles.bg}
              opacity={styles.opacity}
              textAlign="center"
            >
              <ArrowMark />
              <Text
                mt={2}
                color="white"
                fontFamily="Archivo Black, sans-serif"
                fontSize="2xl"
                lineHeight="1"
              >
                {slot.label ?? '—'}
              </Text>
            </Box>
          )
        })}
      </Grid>
      {showBogey && (
        <Text fontSize="sm" color="orange.300" textAlign="center">
          Bogey — no 3-dart finish
        </Text>
      )}
    </Stack>
  )
}
