import { useMemo, useState } from 'react'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { getCountingVisits } from '@open-darts/game/types/visit'
import {
  getLegWinnerIdFromVisits,
  getLegStartingPlayerIndex,
  getMatchWinnerId,
  getPlayedLegNumbers,
  getVisitsForLeg,
} from '@open-darts/game/game/matchLegs'
import { buildLegVisitRows } from '../../lib/analytics/legVisitRows'
import { getVisibleMatchStatRows } from '../../lib/analytics/matchStatRows'
import {
  computeLegPlayerStats,
  computeMatchPlayerStats,
} from '../../lib/analytics/matchPlayerStats'
import { StatsTable } from '../StatsTable/StatsTable'
import { MatchStatsScopeSelector } from './MatchStatsScopeSelector'
import type { MatchStatsScope } from './MatchStatsScopeSelector'

export interface MatchStatsPanelProps {
  session: GameSession
}

const getLegScopeForVisits = (
  selectedScope: MatchStatsScope,
  legNumbers: number[],
): number | undefined => {
  if (selectedScope !== 'match') {
    return selectedScope
  }

  if (legNumbers.length === 1) {
    return legNumbers[0]
  }

  return undefined
}

export const MatchStatsPanel = ({ session }: MatchStatsPanelProps) => {
  const legNumbers = useMemo(() => getPlayedLegNumbers(session.visits), [session.visits])
  const playerIds = useMemo(() => session.players.map((player) => player.id), [session.players])
  const [selectedScope, setSelectedScope] = useState<MatchStatsScope>('match')

  const matchStatsByPlayer = useMemo(() => {
    if (session.mode !== GameModeId.X01) {
      return {}
    }

    return computeMatchPlayerStats(session)
  }, [session])

  const statRows = useMemo(
    () => getVisibleMatchStatRows(matchStatsByPlayer, playerIds),
    [matchStatsByPlayer, playerIds],
  )

  const statsByPlayer = useMemo(() => {
    if (session.mode !== GameModeId.X01) {
      return {}
    }

    if (selectedScope === 'match') {
      return matchStatsByPlayer
    }

    return computeLegPlayerStats(session, selectedScope)
  }, [matchStatsByPlayer, selectedScope, session])

  const legScopeForVisits = getLegScopeForVisits(selectedScope, legNumbers)

  const legVisitRows = useMemo(() => {
    if (legScopeForVisits === undefined) {
      return []
    }

    return buildLegVisitRows(
      getCountingVisits(getVisitsForLeg(session.visits, legScopeForVisits)),
      playerIds,
    )
  }, [legScopeForVisits, playerIds, session.visits])

  const highlightedPlayerId = useMemo(() => {
    if (selectedScope === 'match') {
      return getMatchWinnerId(session)
    }

    if (legScopeForVisits === undefined) {
      return undefined
    }

    return getLegWinnerIdFromVisits(session.visits, legScopeForVisits)
  }, [legScopeForVisits, selectedScope, session])

  const legStarterPlayerId = useMemo(() => {
    if (session.players.length !== 2) {
      return undefined
    }

    const legNumber = selectedScope === 'match' ? 1 : selectedScope
    const startingPlayerIndex = getLegStartingPlayerIndex(
      session.matchProgress?.startingPlayerIndex ?? 0,
      legNumber,
      session.players.length,
    )

    return session.players[startingPlayerIndex]?.id
  }, [selectedScope, session.matchProgress?.startingPlayerIndex, session.players])

  if (session.mode !== GameModeId.X01) {
    return null
  }

  return (
    <>
      <MatchStatsScopeSelector
        legNumbers={legNumbers}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
      />
      <StatsTable
        players={session.players.map((player) => ({ id: player.id, name: player.name }))}
        statsByPlayer={statsByPlayer}
        rows={statRows}
        highlightPlayerIds={highlightedPlayerId === undefined ? [] : [highlightedPlayerId]}
        legStarterPlayerId={legStarterPlayerId}
        additionalRows={legVisitRows}
      />
    </>
  )
}
