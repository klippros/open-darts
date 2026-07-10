import type { MatchProgress } from '../../types/match'
import type { Player } from '../../types/player'

export const formatLegWinLine = (players: Player[], matchProgress: MatchProgress): string =>
  players
    .map((player) => `${player.name} ${matchProgress.legWins[player.id] ?? 0}`)
    .join(' – ')
