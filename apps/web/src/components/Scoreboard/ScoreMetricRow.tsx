import { Flex, Text } from '@chakra-ui/react'
import type { ScoreMetric } from './scoreMetrics'

export interface ScoreMetricRowProps {
  metrics: ScoreMetric[]
}

export const ScoreMetricRow = ({ metrics }: ScoreMetricRowProps) => (
  <Flex mt={2} justify="center" align="flex-start" gap={8} flexWrap="wrap">
    {metrics.map((metric) => (
      <Flex key={`${metric.label}-${metric.value}`} direction="column" align="center" minW={0}>
        <Text
          fontSize="lg"
          fontWeight="bold"
          color={metric.valueColor ?? 'whiteAlpha.600'}
          lineHeight="1"
          textAlign="center"
        >
          {metric.value}
        </Text>
        {metric.label !== '' && (
          <Text mt={1} fontSize="sm" color="whiteAlpha.600" lineHeight="1" textAlign="center">
            {metric.label}
          </Text>
        )}
      </Flex>
    ))}
  </Flex>
)
