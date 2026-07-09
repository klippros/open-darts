import { Box, Stack, Text } from '@chakra-ui/react'

export interface HistoryListItemProps {
  modeLabel: string
  resultSummary: string
  completedAtLabel: string
}

export const HistoryListItem = ({
  modeLabel,
  resultSummary,
  completedAtLabel,
}: HistoryListItemProps) => (
  <Box
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
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
  </Box>
)
