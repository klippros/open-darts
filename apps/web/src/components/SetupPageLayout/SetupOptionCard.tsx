import { Box, Button, Stack, Text } from '@chakra-ui/react'

export interface SetupOptionCardProps {
  label: string
  description: string
  selected: boolean
  onSelect: () => void
  showLiveIndicator?: boolean
}

export const SetupOptionCard = ({
  label,
  description,
  selected,
  onSelect,
  showLiveIndicator = false,
}: SetupOptionCardProps) => (
  <Button
    type="button"
    variant="ghost"
    onClick={onSelect}
    h="auto"
    w="full"
    display="block"
    textAlign="left"
    fontWeight="normal"
    whiteSpace="normal"
    borderWidth="2px"
    borderColor={selected ? 'orange.300' : 'whiteAlpha.200'}
    borderRadius="lg"
    bg={selected ? 'rgba(246, 173, 85, 0.14)' : 'whiteAlpha.50'}
    px={4}
    py={4}
    position="relative"
    transition="border-color 0.15s ease, background 0.15s ease"
    _hover={{
      borderColor: selected ? 'orange.200' : 'whiteAlpha.400',
      bg: selected ? 'rgba(246, 173, 85, 0.2)' : 'whiteAlpha.100',
    }}
    _focusVisible={{ outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '2px' }}
  >
    {showLiveIndicator ? (
      <Box
        className="online-pulse-dot"
        position="absolute"
        top={3}
        right={3}
        w="8px"
        h="8px"
        borderRadius="full"
        bg="yellow.400"
        aria-hidden
      />
    ) : null}
    <Stack gap={1}>
      <Text fontWeight="semibold" color="white">
        {label}
      </Text>
      <Text fontSize="sm" color={selected ? 'whiteAlpha.800' : 'whiteAlpha.700'} lineHeight="1.5">
        {description}
      </Text>
    </Stack>
  </Button>
)
