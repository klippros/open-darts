import { Stack, Text } from '@chakra-ui/react'
import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { getMatchSummary, getSessionModeLabel } from '../../lib/history/sessionSummary'
import { AroundTheClockSummaryPanel } from './AroundTheClockSummaryPanel'
import { Bob27SummaryPanel } from './Bob27SummaryPanel'
import { MatchLegScore } from './MatchLegScore'
import { MatchStatsPanel } from './MatchStatsPanel'

export interface MatchSummaryBodyProps {
  session: GameSession
}

export const MatchSummaryBody = ({ session }: MatchSummaryBodyProps) => {
  const summary = getMatchSummary(session)
  const modeLabel = getSessionModeLabel(session)
  const showTextDetails =
    session.mode !== GameModeId.X01 &&
    session.mode !== GameModeId.AroundTheClock &&
    session.mode !== GameModeId.Bob27

  return (
    <Stack gap={5}>
      {session.mode === GameModeId.AroundTheClock && (
        <AroundTheClockSummaryPanel session={session} />
      )}

      {session.mode === GameModeId.Bob27 && <Bob27SummaryPanel session={session} />}

      {showTextDetails && (
        <>
          <Text
            fontSize="sm"
            color="whiteAlpha.700"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            {modeLabel}
          </Text>

          <Stack gap={1}>
            {summary.details.map((detail) => (
              <Text key={detail} fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
                {detail}
              </Text>
            ))}
          </Stack>
        </>
      )}

      {session.mode === GameModeId.X01 && (
        <>
          <MatchLegScore session={session} />
          <MatchStatsPanel session={session} />
        </>
      )}
    </Stack>
  )
}
