import { Text } from '@chakra-ui/react'
import { formatStatsCountLabel } from './formatStatsCountLabel'

export const StatsCountLabel = ({
  count,
  unit = 'Session',
}: {
  count: number
  unit?: 'Session' | 'Leg'
}) => (
  <Text fontSize="sm" color="whiteAlpha.700" whiteSpace="nowrap">
    {formatStatsCountLabel(count, unit)}
  </Text>
)
