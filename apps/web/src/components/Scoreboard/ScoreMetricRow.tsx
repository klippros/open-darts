import { Flex, Text } from '@chakra-ui/react'
import type { ScoreMetric } from './scoreMetrics'

export interface ScoreMetricRowProps {
  metrics: ScoreMetric[]
}

export const ScoreMetricRow = ({ metrics }: ScoreMetricRowProps) => (
  <Flex justify="center" align="flex-start" columnGap={8} rowGap={3} flexWrap="wrap" w="full">
    {metrics.map((metric) => (
      <Flex
        key={`${metric.label}-${metric.value}`}
        direction="column"
        align="center"
        flexShrink={0}
      >
        <Text
          fontSize="lg"
          fontWeight="bold"
          color={metric.valueColor ?? 'whiteAlpha.600'}
          lineHeight="1"
          textAlign="center"
          whiteSpace="nowrap"
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
