import { Box, Flex, Switch, Text } from '@chakra-ui/react'

export interface SettingsSwitchRowProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export const SettingsSwitchRow = ({
  label,
  description,
  checked,
  onCheckedChange,
}: SettingsSwitchRowProps) => (
  <Flex align="center" justify="space-between" gap={4}>
    <Box flex="1" minW={0}>
      <Text fontSize="sm" fontWeight="medium" color="white">
        {label}
      </Text>
      <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.4">
        {description}
      </Text>
    </Box>
    <Switch.Root
      checked={checked}
      colorPalette="orange"
      onCheckedChange={(details) => {
        onCheckedChange(details.checked)
      }}
    >
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Root>
  </Flex>
)
