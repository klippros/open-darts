import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'

export const getPrimaryPlayerVisits = (session: GameSession): Visit[] => {
  const playerId = session.players[0]?.id

  if (playerId === undefined) {
    return session.visits
  }

  return session.visits.filter((visit) => visit.playerId === playerId)
}

export const getThreeDartAverage = (visits: Visit[]): number | null => {
  if (visits.length === 0) {
    return null
  }

  const total = visits.reduce((sum, visit) => sum + visit.visitScore, 0)

  return total / visits.length
}

export const countCheckoutVisits = (visits: Visit[]): number =>
  visits.filter((visit) => visit.checkout).length

export const isCheckoutPracticeMode = (mode: GameModeId): boolean =>
  mode === GameModeId.X01 || mode === GameModeId.OneTwentyOne || mode === GameModeId.TenUpOneDown

export const sessionFinishedWithCheckout = (session: GameSession): boolean =>
  getPrimaryPlayerVisits(session).some((visit) => visit.checkout)
