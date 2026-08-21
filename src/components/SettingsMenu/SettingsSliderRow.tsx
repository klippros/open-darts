import { Box, Flex, Text } from '@chakra-ui/react'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

export interface SettingsSliderRowProps {
  label: string
  description: string
  value: number
  min: number
  max: number
  step: number
  valueLabel: string
  onValueChange: (value: number) => void
}

export const SettingsSliderRow = ({
  label,
  description,
  value,
  min,
  max,
  step,
  valueLabel,
  onValueChange,
}: SettingsSliderRowProps) => (
  <Box>
    <Flex align="center" justify="space-between" gap={4} mb={2}>
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="medium" color="white">
          {label}
        </Text>
        <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.4">
          {description}
        </Text>
      </Box>
      <Text fontSize="sm" color="whiteAlpha.900" flexShrink={0}>
        {valueLabel}
      </Text>
    </Flex>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      style={rangeInputStyle}
      onChange={(event) => {
        onValueChange(Number(event.target.value))
      }}
    />
  </Box>
)
