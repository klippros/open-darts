import { Box, Button, Stack, Text } from '@chakra-ui/react'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { OnlineMatchSummary } from '../../lib/matchServer/types'
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
      match: OnlineMatchSummary
      resultSummary: string
      canOpenDetail: boolean
    }

export interface HistoryListProps {
  entries: HistoryListEntry[]
  hasMore?: boolean
  onLoadMore?: () => void
  onSelectSession: (session: GameSession) => void
  onSelectOnlineMatch: (match: OnlineMatchSummary, resultSummary: string) => void
}

export const HistoryList = ({
  entries,
  hasMore = false,
  onLoadMore,
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

        const opponentUserId = entry.match.opponentUserId
        const opponentName = entry.match.opponentDisplayName ?? undefined

        return (
          <HistoryListItem
            key={`online:${entry.id}`}
            modeLabel={getOnlineMatchModeLabel(entry.match)}
            resultSummary={entry.resultSummary}
            completedAtLabel={formatOnlineMatchDate(entry.match)}
            badgeLabel="Online"
            opponentProfileTo={opponentUserId === null ? undefined : `/players/${opponentUserId}`}
            opponentName={opponentName}
            onClick={
              entry.canOpenDetail
                ? () => {
                    onSelectOnlineMatch(entry.match, entry.resultSummary)
                  }
                : undefined
            }
          />
        )
      })}
      {hasMore && onLoadMore !== undefined ? (
        <Button variant="cancel" onClick={onLoadMore}>
          More
        </Button>
      ) : null}
    </Stack>
  )
}
