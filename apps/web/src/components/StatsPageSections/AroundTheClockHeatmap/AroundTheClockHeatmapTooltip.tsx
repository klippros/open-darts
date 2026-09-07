import { Box, Stack, Text } from '@chakra-ui/react'

export interface AroundTheClockHeatmapTooltipProps {
  lines: string[]
  x: number
  y: number
}

const TOOLTIP_OFFSET = 12

export const AroundTheClockHeatmapTooltip = ({
  lines,
  x,
  y,
}: AroundTheClockHeatmapTooltipProps) => (
  <Box
    position="absolute"
    left={`${x + TOOLTIP_OFFSET}px`}
    top={`${y + TOOLTIP_OFFSET}px`}
    pointerEvents="none"
    zIndex={1}
    px={3}
    py={2}
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="md"
    bg="blackAlpha.800"
    shadow="md"
    minW="8rem"
  >
    <Stack gap={0.5}>
      {lines.map((line, index) => (
        <Text
          key={line}
          fontSize="sm"
          color={index === 0 ? 'white' : 'whiteAlpha.900'}
          fontWeight={index === 0 ? 'semibold' : 'normal'}
          lineHeight="1.4"
        >
          {line}
        </Text>
      ))}
    </Stack>
  </Box>
)
