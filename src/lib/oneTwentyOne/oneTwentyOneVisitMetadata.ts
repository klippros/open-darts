import type { Visit } from '../../types/visit'

const readMetadataNumber = (visit: Visit | undefined, key: string): number | undefined => {
  const value = visit?.metadata?.[key]

  return typeof value === 'number' ? value : undefined
}

export const getOneTwentyOnePeakTargetFromVisit = (visit: Visit | undefined): number | undefined =>
  readMetadataNumber(visit, 'peakTargetAfter')

export const getOneTwentyOneRoundTargetFromVisit = (visit: Visit | undefined): number | undefined =>
  readMetadataNumber(visit, 'roundTargetAfter')

export const isOneTwentyOneRoundFailedVisit = (visit: Visit): boolean =>
  visit.metadata?.roundFailed === true
