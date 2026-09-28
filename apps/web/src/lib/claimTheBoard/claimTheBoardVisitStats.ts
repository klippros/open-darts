import type { GameSession } from '@open-darts/game/types/gameSession'
import type { Visit } from '@open-darts/game/types/visit'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { countClaimTheBoardTargetHits } from '@open-darts/game/claimTheBoard/claimTheBoardRules'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import { isClaimTheBoardConfig } from '@open-darts/game/game/gameConfigGuards'
import { getPlayerVisits, getPrimaryPlayerVisits } from '../analytics/visitStats'

const readMetadataHitCount = (metadata: Visit['metadata']): number | null => {
  const hitCount = metadata?.hitCount

  if (typeof hitCount === 'number' && Number.isFinite(hitCount) && hitCount >= 0) {
    return hitCount
  }

  return null
}

const readMetadataSharedTargetIndex = (metadata: Visit['metadata']): number | null => {
  const sharedTargetIndex = metadata?.sharedTargetIndex

  return typeof sharedTargetIndex === 'number' && Number.isFinite(sharedTargetIndex)
    ? sharedTargetIndex
    : null
}

export const getClaimTheBoardVisitHitCount = (
  visit: Visit,
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): number => {
  const metadataHitCount = readMetadataHitCount(visit.metadata)

  if (metadataHitCount !== null) {
    return metadataHitCount
  }

  const sharedTargetIndex = readMetadataSharedTargetIndex(visit.metadata)

  if (sharedTargetIndex !== null && visit.darts.length > 0) {
    return countClaimTheBoardTargetHits(visit.darts, sharedTargetIndex, aimMode)
  }

  return visit.visitScore > 0 ? 1 : 0
}

export interface ClaimTheBoardPlayerVisitStats {
  visitCount: number
  totalHits: number
  avgHitsPerVisit: number | null
  fieldsClaimed: number
  fieldsHitOnce: number
  fieldsHitTwice: number
  fieldsHitThrice: number
  finalScore: number | null
}

export const computeClaimTheBoardPlayerVisitStats = (
  visits: Visit[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): ClaimTheBoardPlayerVisitStats => {
  let totalHits = 0
  let fieldsClaimed = 0
  let fieldsHitOnce = 0
  let fieldsHitTwice = 0
  let fieldsHitThrice = 0

  for (const visit of visits) {
    const hitCount = getClaimTheBoardVisitHitCount(visit, aimMode)
    totalHits += hitCount

    if (hitCount === 1) {
      fieldsClaimed += 1
      fieldsHitOnce += 1
    } else if (hitCount === 2) {
      fieldsClaimed += 1
      fieldsHitTwice += 1
    } else if (hitCount >= 3) {
      fieldsClaimed += 1
      fieldsHitThrice += 1
    }
  }

  return {
    visitCount: visits.length,
    totalHits,
    avgHitsPerVisit: visits.length === 0 ? null : totalHits / visits.length,
    fieldsClaimed,
    fieldsHitOnce,
    fieldsHitTwice,
    fieldsHitThrice,
    finalScore: visits.at(-1)?.scoreAfter ?? null,
  }
}

export interface ClaimTheBoardSingleSessionPlayerStats extends ClaimTheBoardPlayerVisitStats {
  playerId: string
  playerName: string
}

export interface ClaimTheBoardSingleSessionStats {
  players: ClaimTheBoardSingleSessionPlayerStats[]
}

export const computeClaimTheBoardSingleSessionStats = (
  session: GameSession,
): ClaimTheBoardSingleSessionStats | null => {
  if (session.mode !== GameModeId.ClaimTheBoard) {
    return null
  }

  const aimMode = isClaimTheBoardConfig(session.mode, session.config)
    ? session.config.aimMode
    : AroundTheClockAimMode.Any

  return {
    players: session.players.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      ...computeClaimTheBoardPlayerVisitStats(getPlayerVisits(session.visits, player.id), aimMode),
    })),
  }
}

export const getClaimTheBoardPrimaryPlayerStats = (
  session: GameSession,
): ClaimTheBoardPlayerVisitStats | null => {
  if (session.mode !== GameModeId.ClaimTheBoard) {
    return null
  }

  const aimMode = isClaimTheBoardConfig(session.mode, session.config)
    ? session.config.aimMode
    : AroundTheClockAimMode.Any

  return computeClaimTheBoardPlayerVisitStats(getPrimaryPlayerVisits(session), aimMode)
}

export const getClaimTheBoardScoreLeaderId = (
  statsByPlayer: Record<string, ClaimTheBoardPlayerVisitStats>,
  playerIds: string[],
): string | undefined => {
  let bestScore = Number.NEGATIVE_INFINITY
  let leaderId: string | undefined

  for (const playerId of playerIds) {
    const score = statsByPlayer[playerId]?.finalScore

    if (score === null || score === undefined) {
      continue
    }

    if (score > bestScore) {
      bestScore = score
      leaderId = playerId
    } else if (score === bestScore) {
      leaderId = undefined
    }
  }

  return leaderId
}
