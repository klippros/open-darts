import { GameStatus } from '../types/gameMode'
import type { GameSession } from '../types/gameSession'
import type { Visit } from '../types/visit'
import { getCountingVisits } from '../types/visit'
import { recordLegWin } from './matchLegs'

export interface AsyncMatchPlayerVisits {
  playerId: string
  visits: Visit[]
}

export interface AsyncMatchResultInput {
  dartsOwnerId: string
  players: [AsyncMatchPlayerVisits, AsyncMatchPlayerVisits]
}

export interface AsyncMatchResult {
  winnerId: string
  visits: Visit[]
}

export const resolveAsyncMatchResult = ({
  dartsOwnerId,
  players,
}: AsyncMatchResultInput): AsyncMatchResult => {
  const [first, second] = players
  const starter = first.playerId === dartsOwnerId ? first : second
  const other = starter.playerId === first.playerId ? second : first
  const starterVisits = getCountingVisits(starter.visits)
  const otherVisits = getCountingVisits(other.visits)
  const starterWins = starterVisits.length <= otherVisits.length
  const visitLimit = Math.min(starterVisits.length, otherVisits.length)
  const starterKeep = starterVisits.slice(0, visitLimit)
  const otherKeep = otherVisits.slice(0, starterWins ? Math.max(0, visitLimit - 1) : visitLimit)
  const visits: Visit[] = []
  let visitIndex = 0
  const roundCount = Math.max(starterKeep.length, otherKeep.length)

  for (let round = 0; round < roundCount; round += 1) {
    const starterVisit = starterKeep[round]

    if (starterVisit !== undefined) {
      visits.push({ ...starterVisit, visitIndex })
      visitIndex += 1
    }

    const otherVisit = otherKeep[round]

    if (otherVisit !== undefined) {
      visits.push({ ...otherVisit, visitIndex })
      visitIndex += 1
    }
  }

  return {
    winnerId: starterWins ? starter.playerId : other.playerId,
    visits,
  }
}

export const applyAsyncMatchResultToSession = (
  session: GameSession,
  result: AsyncMatchResult,
  completedAt: string,
): GameSession => {
  const currentLeg = session.matchProgress?.currentLeg ?? 1
  const visits = [...session.visits]

  for (const visit of result.visits) {
    visits.push({
      ...visit,
      visitIndex: visits.length,
      legIndex: visit.legIndex ?? currentLeg,
    })
  }

  const matchProgress =
    session.matchProgress === undefined
      ? undefined
      : recordLegWin(session.matchProgress, result.winnerId)

  return {
    ...session,
    visits,
    status: GameStatus.Completed,
    completedAt,
    ...(matchProgress === undefined ? {} : { matchProgress }),
  }
}
