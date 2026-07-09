import { Box, Grid, Text } from '@chakra-ui/react'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getVisitDartSlots } from '../../lib/x01/x01CheckoutSuggestions'
import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'

export interface VisitDartSlotsProps {
  scoreBeforeVisit: number
  pendingDarts: DartThrow[]
  config: X01Config
}

const SLOT_KEYS = ['first', 'second', 'third'] as const

const ArrowMark = () => (
  <Box aria-hidden="true" w="full" color="whiteAlpha.600" lineHeight={0}>
    <FontAwesomeIcon icon={faArrowRightLong} style={{ width: '100%', height: '1.1em' }} />
  </Box>
)

const getSlotStyles = (kind: 'thrown' | 'suggested' | 'empty') => {
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

export const VisitDartSlots = ({
  scoreBeforeVisit,
  pendingDarts,
  config,
}: VisitDartSlotsProps) => {
  const slots = getVisitDartSlots(scoreBeforeVisit, pendingDarts, config)

  return (
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
  )
}
