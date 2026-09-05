import type { Visit } from '../../types/visit'

const readMetadataNumber = (visit: Visit | undefined, key: string): number | undefined => {
  const value = visit?.metadata?.[key]

  return typeof value === 'number' ? value : undefined
}

export const getOneTwentyOnePeakTargetFromVisit = (visit: Visit | undefined): number | undefined =>
  readMetadataNumber(visit, 'peakTargetAfter')

/** Round target in play for this visit (the score being checked out). */
export const getOneTwentyOneAttemptedTargetFromVisit = (
  visit: Visit | undefined,
): number | undefined => readMetadataNumber(visit, 'roundTarget')

export const getOneTwentyOneRoundTargetFromVisit = (visit: Visit | undefined): number | undefined =>
  readMetadataNumber(visit, 'roundTargetAfter')

export const isOneTwentyOneRoundFailedVisit = (visit: Visit): boolean =>
  visit.metadata?.roundFailed === true
