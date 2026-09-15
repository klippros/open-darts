import { Box, Stack, Text } from '@chakra-ui/react'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { OnlineMatchHistoryRow } from '../../lib/matchServer/types'
import {
  formatSessionDate,
  getSessionCompletedAt,
  getSessionModeLabel,
  getSessionResultSummary,
} from '../../lib/history/sessionSummary'
import {
  formatOnlineMatchDate,
  getOnlineMatchModeLabel,
  HistoryEntrySource,
} from '../../lib/history/onlineHistorySummary'
import { HistoryListItem } from './HistoryListItem'

export type HistoryListEntry =
  | {
      source: HistoryEntrySource.Local
      id: string
      sortAt: string
      session: GameSession
    }
  | {
      source: HistoryEntrySource.Online
      id: string
      sortAt: string
      match: OnlineMatchHistoryRow
      resultSummary: string
    }

export interface HistoryListProps {
  entries: HistoryListEntry[]
  onSelectSession: (session: GameSession) => void
  onSelectOnlineMatch: (match: OnlineMatchHistoryRow, resultSummary: string) => void
}

export const HistoryList = ({
  entries,
  onSelectSession,
  onSelectOnlineMatch,
}: HistoryListProps) => {
  if (entries.length === 0) {
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
      {entries.map((entry) => {
        if (entry.source === HistoryEntrySource.Local) {
          return (
            <HistoryListItem
              key={`local:${entry.id}`}
              modeLabel={getSessionModeLabel(entry.session)}
              resultSummary={getSessionResultSummary(entry.session)}
              completedAtLabel={formatSessionDate(getSessionCompletedAt(entry.session))}
              onClick={() => {
                onSelectSession(entry.session)
              }}
            />
          )
        }

        return (
          <HistoryListItem
            key={`online:${entry.id}`}
            modeLabel={getOnlineMatchModeLabel(entry.match)}
            resultSummary={entry.resultSummary}
            completedAtLabel={formatOnlineMatchDate(entry.match)}
            badgeLabel="Online"
            onClick={() => {
              onSelectOnlineMatch(entry.match, entry.resultSummary)
            }}
          />
        )
      })}
    </Stack>
  )
}
