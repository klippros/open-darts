import { useMemo, useState } from 'react'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { getCountingVisits } from '@open-darts/game/types/visit'
import {
  getLegStartingPlayerIndex,
  getMatchWinnerId,
  getPlayedLegNumbers,
  getVisitsForLeg,
} from '@open-darts/game/game/matchLegs'
import { isClaimTheBoardConfig } from '@open-darts/game/game/gameConfigGuards'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import { formatAverage, formatInteger } from '../../lib/analytics/formatAnalytics'
import type { LegVisitTableRow } from '../../lib/analytics/legVisitRows'
import {
  computeClaimTheBoardPlayerVisitStats,
  getClaimTheBoardScoreLeaderId,
} from '../../lib/claimTheBoard/claimTheBoardVisitStats'
import type { ClaimTheBoardPlayerVisitStats } from '../../lib/claimTheBoard/claimTheBoardVisitStats'
import { StatsTable } from '../StatsTable/StatsTable'
import { MatchLegScore } from './MatchLegScore'
import { MatchStatsScopeSelector } from './MatchStatsScopeSelector'
import type { MatchStatsScope } from './MatchStatsScopeSelector'

export interface ClaimTheBoardSummaryPanelProps {
  session: GameSession
}

const playerStats = (
  statsByPlayer: Record<string, ClaimTheBoardPlayerVisitStats>,
  playerId: string,
): ClaimTheBoardPlayerVisitStats =>
  statsByPlayer[playerId] ?? {
    visitCount: 0,
    totalHits: 0,
    avgHitsPerVisit: null,
    fieldsClaimed: 0,
    fieldsHitOnce: 0,
    fieldsHitTwice: 0,
    fieldsHitThrice: 0,
    finalScore: null,
  }

const buildClaimTheBoardStatRows = (
  statsByPlayer: Record<string, ClaimTheBoardPlayerVisitStats>,
): LegVisitTableRow[] => [
  {
    id: 'claim-score',
    label: 'Score',
    getCellValue: (playerId) => formatInteger(playerStats(statsByPlayer, playerId).finalScore),
  },
  {
    id: 'claim-avg-hits',
    label: 'Avg hits / visit',
    getCellValue: (playerId) => formatAverage(playerStats(statsByPlayer, playerId).avgHitsPerVisit),
  },
  {
    id: 'claim-fields-claimed',
    label: 'Fields claimed',
    getCellValue: (playerId) => formatInteger(playerStats(statsByPlayer, playerId).fieldsClaimed),
  },
  {
    id: 'claim-fields-once',
    label: '1 hit',
    getCellValue: (playerId) => formatInteger(playerStats(statsByPlayer, playerId).fieldsHitOnce),
  },
  {
    id: 'claim-fields-twice',
    label: '2 hits',
    getCellValue: (playerId) => formatInteger(playerStats(statsByPlayer, playerId).fieldsHitTwice),
  },
  {
    id: 'claim-fields-thrice',
    label: '3 hits',
    getCellValue: (playerId) => formatInteger(playerStats(statsByPlayer, playerId).fieldsHitThrice),
  },
]

export const ClaimTheBoardSummaryPanel = ({ session }: ClaimTheBoardSummaryPanelProps) => {
  const legNumbers = useMemo(() => getPlayedLegNumbers(session.visits), [session.visits])
  const playerIds = useMemo(() => session.players.map((player) => player.id), [session.players])
  const [selectedScope, setSelectedScope] = useState<MatchStatsScope>('match')

  const aimMode = isClaimTheBoardConfig(session.mode, session.config)
    ? session.config.aimMode
    : AroundTheClockAimMode.Any

  const scopedVisits = useMemo(() => {
    if (selectedScope === 'match') {
      return getCountingVisits(session.visits)
    }

    return getCountingVisits(getVisitsForLeg(session.visits, selectedScope))
  }, [selectedScope, session.visits])

  const statsByPlayer = useMemo(() => {
    const result: Record<string, ClaimTheBoardPlayerVisitStats> = {}

    for (const player of session.players) {
      result[player.id] = computeClaimTheBoardPlayerVisitStats(
        scopedVisits.filter((visit) => visit.playerId === player.id),
        aimMode,
      )
    }

    return result
  }, [aimMode, scopedVisits, session.players])

  const additionalRows = useMemo(() => buildClaimTheBoardStatRows(statsByPlayer), [statsByPlayer])

  const highlightedPlayerId = useMemo(() => {
    if (selectedScope === 'match') {
      return getMatchWinnerId(session) ?? getClaimTheBoardScoreLeaderId(statsByPlayer, playerIds)
    }

    return getClaimTheBoardScoreLeaderId(statsByPlayer, playerIds)
  }, [playerIds, selectedScope, session, statsByPlayer])

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

  if (session.mode !== GameModeId.ClaimTheBoard) {
    return null
  }

  return (
    <>
      <MatchLegScore session={session} />
      <MatchStatsScopeSelector
        legNumbers={legNumbers}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
      />
      <StatsTable
        players={session.players.map((player) => ({ id: player.id, name: player.name }))}
        rows={[]}
        highlightPlayerIds={highlightedPlayerId === undefined ? [] : [highlightedPlayerId]}
        legStarterPlayerId={legStarterPlayerId}
        additionalRows={additionalRows}
      />
    </>
  )
}
