import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'

export const getVisitAverages = (players: Player[], visits: Visit[]): Record<string, number | null> =>
  Object.fromEntries(
    players.map((player) => {
      const playerVisits = visits.filter((visit) => visit.playerId === player.id)

      if (playerVisits.length === 0) {
        return [player.id, null]
      }

      const total = playerVisits.reduce((sum, visit) => sum + visit.visitScore, 0)

      return [player.id, total / playerVisits.length]
    }),
  )
