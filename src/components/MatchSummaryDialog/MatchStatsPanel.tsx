import { useMemo, useState } from 'react'
import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { buildLegVisitRows } from '../../lib/analytics/legVisitRows'
import { getVisibleMatchStatRows } from '../../lib/analytics/matchStatRows'
import {
  computeLegPlayerStats,
  computeMatchPlayerStats,
} from '../../lib/analytics/matchPlayerStats'
import {
  getLegWinnerIdFromVisits,
  getPlayedLegNumbers,
  getVisitsForLeg,
} from '../../lib/game/matchLegs'
import { StatsTable } from '../StatsTable/StatsTable'
import { MatchStatsScopeSelector, type MatchStatsScope } from './MatchStatsScopeSelector'

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
      getVisitsForLeg(session.visits, legScopeForVisits),
      session.players.map((player) => player.id),
    )
  }, [legScopeForVisits, session.visits])

  const legWinnerId =
    legScopeForVisits === undefined
      ? undefined
      : getLegWinnerIdFromVisits(session.visits, legScopeForVisits)

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
        highlightPlayerIds={legWinnerId === undefined ? [] : [legWinnerId]}
        additionalRows={legVisitRows}
      />
    </>
  )
}
