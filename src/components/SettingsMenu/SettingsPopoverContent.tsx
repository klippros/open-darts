import { Box, Flex, Switch, Text } from '@chakra-ui/react'
import { useSettings } from '../../hooks/settingsContext'

export const SettingsPopoverContent = () => {
  const { scoreCallerEnabled, setScoreCallerEnabled } = useSettings()

  return (
    <Flex align="center" justify="space-between" gap={4}>
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="medium" color="white">
          Score caller
        </Text>
        <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.4">
          Speak scores during play
        </Text>
      </Box>
      <Switch.Root
        checked={scoreCallerEnabled}
        colorPalette="orange"
        onCheckedChange={(details) => {
          setScoreCallerEnabled(details.checked)
        }}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </Flex>
  )
}
