import { Box, Flex, Switch, Text } from '@chakra-ui/react'
import { useId } from 'react'

export interface SettingsSwitchRowProps {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

export const SettingsSwitchRow = ({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: SettingsSwitchRowProps) => {
  const inputId = useId()
  const descriptionId = useId()

  return (
    <Flex align="center" justify="space-between" gap={4}>
      <Box flex="1" minW={0}>
        <label htmlFor={inputId}>
          <Text fontSize="sm" fontWeight="medium" color="white">
            {label}
          </Text>
        </label>
        <Text id={descriptionId} fontSize="xs" color="whiteAlpha.600" lineHeight="1.4">
          {description}
        </Text>
      </Box>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        colorPalette="orange"
        onCheckedChange={(details) => {
          onCheckedChange(details.checked)
        }}
      >
        <Switch.HiddenInput id={inputId} aria-describedby={descriptionId} />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </Flex>
  )
}
