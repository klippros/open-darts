import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { formatCount } from '../../../lib/analytics/formatAnalytics'

interface HeatmapLegendStop {
  label: string
  color: string
}

export interface AroundTheClockHeatmapLegendProps {
  stops: readonly HeatmapLegendStop[]
  overallAverage: number | null
}

export const AroundTheClockHeatmapLegend = ({
  stops,
  overallAverage,
}: AroundTheClockHeatmapLegendProps) => (
  <Stack gap={2}>
    <Box
      h="10px"
      borderRadius="full"
      overflow="hidden"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg={`linear-gradient(90deg, ${stops.map((stop) => stop.color).join(', ')})`}
    />
    <Flex justify="space-between" gap={3}>
      {stops.map((stop) => (
        <Text key={stop.label} fontSize="xs" color="whiteAlpha.600">
          {stop.label}
        </Text>
      ))}
    </Flex>
    {overallAverage !== null && (
      <Text fontSize="sm" color="whiteAlpha.700" textAlign="center">
        Colors compare each target to {formatCount(overallAverage)} avg darts per hit
      </Text>
    )}
  </Stack>
)
