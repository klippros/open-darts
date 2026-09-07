import { Grid } from '@chakra-ui/react'
import { formatDart } from '../../lib/formatDart'
import { getVisitDartSlots } from '../../lib/checkout/checkoutSuggestions'
import type { VisitDartSlotView } from '../../lib/checkout/checkoutSuggestions'
import type { DartThrow } from '../../types/dart'
import type { CheckoutRules } from '../../types/checkout'
import { VisitDartSlotCard } from './VisitDartSlotCard'

export interface VisitDartSlotsProps {
  pendingDarts: DartThrow[]
  config?: CheckoutRules | null
  scoreBeforeVisit?: number
}

const SLOT_KEYS = ['first', 'second', 'third'] as const

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

const toSlotVariant = (kind: VisitDartSlotView['kind']) => {
  if (kind === 'thrown') {
    return 'thrown' as const
  }

  if (kind === 'suggested') {
    return 'empty' as const
  }

  return 'empty' as const
}

export const VisitDartSlots = ({
  pendingDarts,
  config = null,
  scoreBeforeVisit = 0,
}: VisitDartSlotsProps) => {
  const slots =
    config === null
      ? getSimpleVisitDartSlots(pendingDarts)
      : getVisitDartSlots(scoreBeforeVisit, pendingDarts, config)

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={3}>
      {slots.map((slot, index) => (
        <VisitDartSlotCard
          key={SLOT_KEYS[index]}
          label={slot.label}
          variant={toSlotVariant(slot.kind)}
        />
      ))}
    </Grid>
  )
}
