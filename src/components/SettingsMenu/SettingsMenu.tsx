import { Box, Button, Flex, Popover, Portal, Switch, Text } from '@chakra-ui/react'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSettings } from '../../hooks/settingsContext'
import { toolbarControlSize } from '../../layout'

export const SettingsMenu = () => {
  const { scoreCallerEnabled, setScoreCallerEnabled } = useSettings()

  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        <Button
          aria-label="Settings"
          variant="ghost"
          color="whiteAlpha.800"
          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
          minW={toolbarControlSize}
          w={toolbarControlSize}
          h={toolbarControlSize}
          p={0}
        >
          <FontAwesomeIcon icon={faGear} />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            bg="#12182a"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="xl"
            color="white"
            shadow="2xl"
            minW="280px"
            overflow="hidden"
            p={0}
            _focusVisible={{ outline: 'none' }}
          >
            <Popover.Header px={4} py={3} borderBottomWidth="1px" borderColor="whiteAlpha.100">
              <Popover.Title fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
                Settings
              </Popover.Title>
            </Popover.Header>
            <Popover.Body px={4} py={3}>
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
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
