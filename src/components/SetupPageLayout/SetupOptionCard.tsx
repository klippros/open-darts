import { Button, Stack, Text } from '@chakra-ui/react'

export interface SetupOptionCardProps {
  label: string
  description: string
  selected: boolean
  onSelect: () => void
}

export const SetupOptionCard = ({
  label,
  description,
  selected,
  onSelect,
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
    transition="border-color 0.15s ease, background 0.15s ease"
    _hover={{
      borderColor: selected ? 'orange.200' : 'whiteAlpha.400',
      bg: selected ? 'rgba(246, 173, 85, 0.2)' : 'whiteAlpha.100',
    }}
    _focusVisible={{ outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '2px' }}
  >
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
