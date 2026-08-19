import {
  ChallengeLegEndMode,
  ChallengeLegStatus,
  type ChallengeConfig,
  type MatchProgress,
} from '../../types/match'
import type { Visit } from '../../types/visit'
import { getVisitsForLeg } from './matchLegs'

const MIN_CHECKOUT_DARTS_BY_START_SCORE: Record<number, number> = {
  301: 6,
  401: 7,
  501: 9,
}

export const DEFAULT_MAX_VISITS = 9
export const MAX_VISITS_LIMIT = 20

export const getMinCheckoutDarts = (startScore: number): number =>
  MIN_CHECKOUT_DARTS_BY_START_SCORE[startScore] ?? Math.max(6, Math.ceil((startScore / 501) * 9))

export const getMinVisits = (startScore: number): number =>
  Math.ceil(getMinCheckoutDarts(startScore) / 3)

export const getMaxVisits = (): number => MAX_VISITS_LIMIT

export const clampMaxVisits = (maxVisits: number, startScore: number): number =>
  Math.min(getMaxVisits(), Math.max(getMinVisits(startScore), Math.round(maxVisits)))

export const getTargetThreeDartAverage = (startScore: number, maxVisits: number): number =>
  startScore / maxVisits

export const formatTargetThreeDartAverage = (startScore: number, maxVisits: number): string =>
  getTargetThreeDartAverage(startScore, maxVisits).toFixed(1)

export const formatChallengeTargetLabel = (startScore: number, maxVisits: number): string => {
  const dartBudget = maxVisits * 3
  const average = formatTargetThreeDartAverage(startScore, maxVisits)

  return `${maxVisits} visit${maxVisits === 1 ? '' : 's'} · up to ${dartBudget} darts · ~${average} avg`
}

export const parseMaxVisits = (value: string | null | undefined, startScore: number): number => {
  if (value === null || value === undefined || value.trim() === '') {
    return clampMaxVisits(DEFAULT_MAX_VISITS, startScore)
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return clampMaxVisits(DEFAULT_MAX_VISITS, startScore)
  }

  return clampMaxVisits(parsed, startScore)
}

const challengeLegEndModes = new Set<string>([
  ChallengeLegEndMode.PlayToCheckout,
  ChallengeLegEndMode.StopAtLimit,
])

export const isChallengeLegEndMode = (value: string): value is ChallengeLegEndMode =>
  challengeLegEndModes.has(value)

export const parseChallengeLegEndMode = (value: string | null | undefined): ChallengeLegEndMode => {
  if (value !== null && value !== undefined && isChallengeLegEndMode(value)) {
    return value
  }

  return ChallengeLegEndMode.PlayToCheckout
}

export const isChallengeMode = (matchProgress: MatchProgress | undefined): boolean =>
  matchProgress?.challenge !== undefined

export const countPlayerVisitsInLeg = (
  visits: Visit[],
  legNumber: number,
  playerId: string,
): number =>
  getVisitsForLeg(visits, legNumber).filter((visit) => visit.playerId === playerId).length

export const isLegWithinVisitLimit = (visitsUsed: number, maxVisits: number): boolean =>
  visitsUsed <= maxVisits

export const shouldEndLegAtVisitLimit = (
  legEndMode: ChallengeLegEndMode,
  visitsUsed: number,
  maxVisits: number,
  remaining: number,
): boolean =>
  legEndMode === ChallengeLegEndMode.StopAtLimit && remaining > 0 && visitsUsed >= maxVisits

export type ChallengeLegOutcome = ChallengeLegStatus.Won | ChallengeLegStatus.Lost | null

export const resolveChallengeLegOutcome = (
  challenge: ChallengeConfig,
  visitsUsed: number,
  remaining: number,
  checkout: boolean,
): ChallengeLegOutcome => {
  if (checkout) {
    return isLegWithinVisitLimit(visitsUsed, challenge.maxVisits)
      ? ChallengeLegStatus.Won
      : ChallengeLegStatus.Lost
  }

  if (shouldEndLegAtVisitLimit(challenge.legEndMode, visitsUsed, challenge.maxVisits, remaining)) {
    return ChallengeLegStatus.Lost
  }

  return null
}

export const createChallengeConfig = (
  maxVisits: number,
  legEndMode: ChallengeLegEndMode,
  startScore: number,
): ChallengeConfig => ({
  maxVisits: clampMaxVisits(maxVisits, startScore),
  legEndMode,
})

export const isOverVisitLimit = (visitsUsed: number, maxVisits: number): boolean =>
  visitsUsed > maxVisits

export const formatChallengeVisitProgressLabel = (
  visitsUsed: number,
  maxVisits: number,
  remaining: number,
): string => {
  if (remaining > 0 && isOverVisitLimit(visitsUsed, maxVisits)) {
    return `Visit ${visitsUsed} / ${maxVisits} · over limit`
  }

  return `Visit ${visitsUsed} / ${maxVisits}`
}

export const getChallengeMaxLegs = (legsToWin: number): number => legsToWin * 2 - 1

export const getCompletedChallengeLegOutcome = (
  visits: Visit[],
  legNumber: number,
  playerId: string,
  challenge: ChallengeConfig,
): ChallengeLegStatus.Won | ChallengeLegStatus.Lost | null => {
  const legVisits = getVisitsForLeg(visits, legNumber).filter(
    (visit) => visit.playerId === playerId,
  )

  if (legVisits.length === 0) {
    return null
  }

  const lastVisit = legVisits.at(-1)

  if (lastVisit === undefined) {
    return null
  }

  const visitsUsed = legVisits.length

  return resolveChallengeLegOutcome(challenge, visitsUsed, lastVisit.scoreAfter, lastVisit.checkout)
}

export const getChallengeLegStatuses = (
  visits: Visit[],
  playerId: string,
  matchProgress: MatchProgress,
): ChallengeLegStatus[] => {
  const challenge = matchProgress.challenge

  if (challenge === undefined) {
    return []
  }

  const maxLegs = getChallengeMaxLegs(matchProgress.legsToWin)

  return Array.from({ length: maxLegs }, (_, index) => {
    const legNumber = index + 1
    const outcome = getCompletedChallengeLegOutcome(visits, legNumber, playerId, challenge)

    if (outcome === ChallengeLegStatus.Won || outcome === ChallengeLegStatus.Lost) {
      return outcome
    }

    if (legNumber === matchProgress.currentLeg) {
      return ChallengeLegStatus.Current
    }

    return ChallengeLegStatus.Upcoming
  })
}

export const formatChallengeMatchScore = (wins: number, losses: number): string =>
  `${wins} – ${losses}`

export const formatChallengeLegProgressLabel = (statuses: ChallengeLegStatus[]): string => {
  const wins = statuses.filter((status) => status === ChallengeLegStatus.Won).length
  const losses = statuses.filter((status) => status === ChallengeLegStatus.Lost).length

  return `${wins} won, ${losses} lost`
}
