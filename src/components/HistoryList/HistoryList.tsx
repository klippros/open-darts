import { Box, Stack, Text } from '@chakra-ui/react'
import type { GameSession } from '../../types/gameSession'
import {
  formatSessionDate,
  getSessionCompletedAt,
  getSessionModeLabel,
  getSessionResultSummary,
} from '../../lib/history/sessionSummary'
import { HistoryListItem } from './HistoryListItem'

export interface HistoryListProps {
  sessions: GameSession[]
}

export const HistoryList = ({ sessions }: HistoryListProps) => {
  if (sessions.length === 0) {
    return (
      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        bg="whiteAlpha.50"
        px={5}
        py={6}
      >
        <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.65">
          No completed games yet. Finish a match and it will show up here.
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={3}>
      {sessions.map((session) => (
        <HistoryListItem
          key={session.id}
          modeLabel={getSessionModeLabel(session)}
          resultSummary={getSessionResultSummary(session)}
          completedAtLabel={formatSessionDate(getSessionCompletedAt(session))}
        />
      ))}
    </Stack>
  )
}
