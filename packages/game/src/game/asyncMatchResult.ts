import type { Visit } from '../types/visit'

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

const countingVisitCount = (player: AsyncMatchPlayerVisits): number =>
  player.visits.filter((visit) => visit.voided !== true).length

const resolveWinnerId = (
  dartsOwnerId: string,
  first: AsyncMatchPlayerVisits,
  second: AsyncMatchPlayerVisits,
): string => {
  const firstCount = countingVisitCount(first)
  const secondCount = countingVisitCount(second)

  if (firstCount < secondCount) {
    return first.playerId
  }

  if (secondCount < firstCount) {
    return second.playerId
  }

  return dartsOwnerId
}

export const resolveAsyncMatchResult = ({
  dartsOwnerId,
  players,
}: AsyncMatchResultInput): AsyncMatchResult => {
  const [first, second] = players
  const winnerId = resolveWinnerId(dartsOwnerId, first, second)
  const starter = first.playerId === dartsOwnerId ? first : second
  const other = starter.playerId === first.playerId ? second : first
  const winnerCount =
    winnerId === first.playerId ? countingVisitCount(first) : countingVisitCount(second)
  const starterCountingCount = winnerCount
  const otherCountingCount =
    winnerId === starter.playerId ? Math.max(0, winnerCount - 1) : winnerCount
  const visits: Visit[] = []
  let starterIndex = 0
  let otherIndex = 0
  let visitIndex = 0

  const pushVisit = (visit: Visit, voided: boolean): void => {
    visits.push({
      ...visit,
      visitIndex,
      voided: voided ? true : undefined,
    })
    visitIndex += 1
  }

  while (starterIndex < starter.visits.length || otherIndex < other.visits.length) {
    const starterVisit = starter.visits[starterIndex]

    if (starterVisit !== undefined) {
      pushVisit(starterVisit, starterIndex >= starterCountingCount)
      starterIndex += 1
    }

    const otherVisit = other.visits[otherIndex]

    if (otherVisit !== undefined) {
      pushVisit(otherVisit, otherIndex >= otherCountingCount)
      otherIndex += 1
    }
  }

  return { winnerId, visits }
}
