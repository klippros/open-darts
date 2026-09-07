import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'
import { getVisitDartCount } from '../../types/visit'
import { GameModeId } from '../../types/gameMode'
import { getPrimaryPlayerVisits, getSessionFinalScore } from '../analytics/visitStats'
import { countBob27TargetHits } from './bob27Rules'

const readMetadataHitCount = (metadata: Visit['metadata']): number | null => {
  const hitCount = metadata?.hitCount

  if (typeof hitCount === 'number' && Number.isFinite(hitCount) && hitCount >= 0) {
    return hitCount
  }

  return null
}

const readMetadataHit = (metadata: Visit['metadata']): boolean | null => {
  const hit = metadata?.hit

  return typeof hit === 'boolean' ? hit : null
}

const readMetadataTargetIndex = (metadata: Visit['metadata']): number | null => {
  const targetLabel = metadata?.targetLabel

  if (typeof targetLabel !== 'string') {
    return null
  }

  if (targetLabel === 'Bull') {
    return 20
  }

  const match = /^D(\d+)$/u.exec(targetLabel)

  if (match?.[1] === undefined) {
    return null
  }

  return Number(match[1]) - 1
}

/** Resolves how many target hits a Bob's 27 visit recorded (supports legacy boolean `hit`). */
export const getBob27VisitHitCount = (visit: Visit): number => {
  const metadataHitCount = readMetadataHitCount(visit.metadata)

  if (metadataHitCount !== null) {
    return metadataHitCount
  }

  const targetIndex = readMetadataTargetIndex(visit.metadata)

  if (targetIndex !== null && visit.darts.length > 0) {
    return countBob27TargetHits(visit.darts, targetIndex)
  }

  const metadataHit = readMetadataHit(visit.metadata)

  if (metadataHit !== null) {
    return metadataHit ? 1 : 0
  }

  return visit.visitScore > 0 ? 1 : 0
}

/** Percentage of darts that hit the target across visits. */
export const getBob27VisitHitRate = (visits: Visit[]): number | null => {
  const dartsThrown = visits.reduce((sum, visit) => sum + getVisitDartCount(visit), 0)

  if (dartsThrown === 0) {
    return null
  }

  const hits = visits.reduce((sum, visit) => sum + getBob27VisitHitCount(visit), 0)

  return (hits / dartsThrown) * 100
}

export const getBob27AvgHitsPerVisit = (visits: Visit[]): number | null => {
  if (visits.length === 0) {
    return null
  }

  const hits = visits.reduce((sum, visit) => sum + getBob27VisitHitCount(visit), 0)

  return hits / visits.length
}

/** Total target hits (doubles + bull) recorded for the primary player in a Bob's 27 session. */
export const getBob27SessionDoublesHit = (session: GameSession): number =>
  getPrimaryPlayerVisits(session).reduce((sum, visit) => sum + getBob27VisitHitCount(visit), 0)

export interface Bob27SingleSessionStats {
  doublesHit: number
  avgHitsPerVisit: number | null
  hitRate: number | null
  finalScore: number | null
  visitCount: number
}

export const computeBob27SingleSessionStats = (
  session: GameSession,
): Bob27SingleSessionStats | null => {
  if (session.mode !== GameModeId.Bob27) {
    return null
  }

  const visits = getPrimaryPlayerVisits(session)
  const doublesHit = getBob27SessionDoublesHit(session)

  return {
    doublesHit,
    avgHitsPerVisit: getBob27AvgHitsPerVisit(visits),
    hitRate: getBob27VisitHitRate(visits),
    finalScore: getSessionFinalScore(session),
    visitCount: visits.length,
  }
}
