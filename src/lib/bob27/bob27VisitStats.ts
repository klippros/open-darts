import type { Visit } from '../../types/visit'
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

  const match = /^D(\d+)$/.exec(targetLabel)

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

export const getBob27VisitHitRate = (visits: Visit[]): number | null => {
  if (visits.length === 0) {
    return null
  }

  const hitVisits = visits.filter((visit) => getBob27VisitHitCount(visit) > 0).length

  return (hitVisits / visits.length) * 100
}
