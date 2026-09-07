import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'
import { getVisitDartCount } from '../../types/visit'
import { getPlayedLegNumbers, getVisitsForLeg } from '../game/matchLegs'
import { getPrimaryPlayerVisits } from './visitStats'

export interface X01LegSlice {
  session: GameSession
  legNumber: number
  visits: Visit[]
}

export const expandX01SessionLegs = (session: GameSession): X01LegSlice[] => {
  const primaryVisits = getPrimaryPlayerVisits(session)

  return getPlayedLegNumbers(session.visits)
    .map((legNumber) => ({
      session,
      legNumber,
      visits: getVisitsForLeg(primaryVisits, legNumber),
    }))
    .filter((slice) => slice.visits.length > 0)
}

export const expandX01SessionsLegs = (sessions: GameSession[]): X01LegSlice[] =>
  sessions.flatMap(expandX01SessionLegs)

export const legFinishedWithCheckout = (visits: Visit[]): boolean =>
  visits.some((visit) => visit.checkout)

export const countDartsInVisits = (visits: Visit[]): number =>
  visits.reduce((sum, visit) => sum + getVisitDartCount(visit), 0)

export const getX01LegSlicePointId = (slice: X01LegSlice): string =>
  `${slice.session.id}:leg:${slice.legNumber}`

export const getSessionIdFromTimelinePointId = (pointId: string): string => {
  const match = /^(.*):leg:\d+$/u.exec(pointId)

  return match?.[1] ?? pointId
}
