import { Box, HStack } from '@chakra-ui/react'

export interface VoiceLevelMeterProps {
  active: boolean
  level: number
}

/** Compact VU bars for the toolbar mic control. */
export const VoiceLevelMeter = ({ active, level }: VoiceLevelMeterProps) => {
  const bars = [0.25, 0.5, 0.75, 1]

  return (
    <HStack gap="2px" h="14px" align="flex-end" opacity={active ? 1 : 0.35}>
      {bars.map((threshold) => (
        <Box
          key={threshold}
          w="2px"
          h={`${4 + threshold * 10}px`}
          borderRadius="full"
          bg={active && level >= threshold * 0.35 ? 'orange.300' : 'whiteAlpha.400'}
          transition="background 80ms linear"
        />
      ))}
    </HStack>
  )
}
