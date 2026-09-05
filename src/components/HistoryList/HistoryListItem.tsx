import { Button, Stack, Text } from '@chakra-ui/react'

export interface HistoryListItemProps {
  modeLabel: string
  resultSummary: string
  completedAtLabel: string
  onClick: () => void
}

export const HistoryListItem = ({
  modeLabel,
  resultSummary,
  completedAtLabel,
  onClick,
}: HistoryListItemProps) => (
  <Button
    type="button"
    onClick={onClick}
    variant="ghost"
    h="auto"
    w="full"
    display="block"
    textAlign="left"
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
    cursor="pointer"
    fontWeight="normal"
    whiteSpace="normal"
    transition="border-color 0.15s ease, background 0.15s ease"
    _hover={{ borderColor: 'whiteAlpha.400', bg: 'whiteAlpha.100' }}
    _focusVisible={{ outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '2px' }}
  >
    <Stack gap={1}>
      <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" gap={1}>
        <Text fontWeight="semibold" color="white">
          {modeLabel}
        </Text>
        <Text fontSize="sm" color="whiteAlpha.600">
          {completedAtLabel}
        </Text>
      </Stack>
      <Text fontSize="sm" color="whiteAlpha.700">
        {resultSummary}
      </Text>
    </Stack>
  </Button>
)
