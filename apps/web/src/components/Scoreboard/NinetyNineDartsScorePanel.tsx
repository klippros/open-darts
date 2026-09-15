import { Box, Flex, Text } from '@chakra-ui/react'
import type { NinetyNineDartsLiveScoreMetric } from '../../lib/ninetyNineDarts/ninetyNineVisitStats'

export interface NinetyNineDartsScorePanelProps {
  metrics: NinetyNineDartsLiveScoreMetric[]
  isActive?: boolean
}

export const NinetyNineDartsScorePanel = ({
  metrics,
  isActive = true,
}: NinetyNineDartsScorePanelProps) => (
  <Box
    px={4}
    py={4}
    borderRadius="16px"
    borderWidth="1px"
    borderColor={isActive ? 'whiteAlpha.500' : 'whiteAlpha.200'}
    bg={isActive ? 'whiteAlpha.100' : 'whiteAlpha.50'}
  >
    <Flex align="stretch" justify="space-between" gap={2} w="full">
      {metrics.map((metric) => (
        <Flex
          key={metric.label}
          direction="column"
          align="center"
          justify="center"
          flex="1"
          minW={0}
        >
          <Text
            color="white"
            fontFamily="Archivo Black, sans-serif"
            fontSize={{ base: '3xl', sm: '4xl' }}
            lineHeight="1"
            textAlign="center"
          >
            {metric.value}
          </Text>
          <Text mt={2} fontSize="sm" color="whiteAlpha.600" textAlign="center" lineHeight="1.2">
            {metric.label}
          </Text>
        </Flex>
      ))}
    </Flex>
  </Box>
)
