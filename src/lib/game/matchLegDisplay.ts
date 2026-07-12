import type { MatchProgress } from '../../types/match'
import type { Player } from '../../types/player'

export const formatLegWinLine = (players: Player[], matchProgress: MatchProgress): string =>
  players.map((player) => `${player.name} ${matchProgress.legWins[player.id] ?? 0}`).join(' – ')

export const formatLegWinScore = (
  players: Player[],
  matchProgress: MatchProgress,
): string | null => {
  if (players.length !== 2) {
    return null
  }

  const [leftPlayer, rightPlayer] = players

  if (leftPlayer === undefined || rightPlayer === undefined) {
    return null
  }

  const leftWins = matchProgress.legWins[leftPlayer.id] ?? 0
  const rightWins = matchProgress.legWins[rightPlayer.id] ?? 0

  return `${leftWins}:${rightWins}`
}
