import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { MatchProgress } from '../../types/match'
import { DEFAULT_LEGS_TO_WIN, LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '../../types/match'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import type { X01State } from '../../types/x01'

export interface MatchFormat {
  legsToWin: number
  startingPlayerIndex: number
}

export const DEFAULT_MATCH_FORMAT: MatchFormat = {
  legsToWin: DEFAULT_LEGS_TO_WIN,
  startingPlayerIndex: 0,
}

export const clampLegsToWin = (legsToWin: number): number =>
  Math.min(LEGS_TO_WIN_MAX, Math.max(LEGS_TO_WIN_MIN, Math.round(legsToWin)))

export const getMaxPossibleLegs = (legsToWin: number, playerCount: number): number =>
  playerCount <= 1 ? legsToWin : legsToWin * 2 - 1

export const clampStartingPlayerIndex = (index: number, playerCount: number): number => {
  if (playerCount <= 1) {
    return 0
  }

  if (index <= 0) {
    return 0
  }

  return 1
}

export const parseLegsToWin = (value: string | null | undefined): number => {
  if (value === null || value === undefined || value.trim() === '') {
    return DEFAULT_LEGS_TO_WIN
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LEGS_TO_WIN
  }

  return clampLegsToWin(parsed)
}

export const parseStartingPlayerIndex = (
  value: string | null | undefined,
  playerCount: number,
): number => {
  if (playerCount <= 1) {
    return 0
  }

  if (value === '1' || value === 'opponent') {
    return 1
  }

  return 0
}

export const createInitialMatchProgress = (
  players: Player[],
  format: MatchFormat,
): MatchProgress | undefined => {
  const legsToWin = clampLegsToWin(format.legsToWin)
  const startingPlayerIndex = clampStartingPlayerIndex(format.startingPlayerIndex, players.length)

  if (players.length === 1 && legsToWin === 1 && startingPlayerIndex === 0) {
    return undefined
  }

  return {
    legsToWin,
    startingPlayerIndex,
    currentLeg: 1,
    legWins: Object.fromEntries(players.map((player) => [player.id, 0])),
  }
}

export const getLegStartingPlayerIndex = (
  startingPlayerIndex: number,
  legNumber: number,
  playerCount: number,
): number => {
  if (playerCount <= 1) {
    return 0
  }

  const offset = legNumber - 1

  return (startingPlayerIndex + offset) % playerCount
}

export const getVisitsForLeg = (visits: Visit[], legNumber: number): Visit[] =>
  visits.filter((visit) => (visit.legIndex ?? 1) === legNumber)

export const getPlayedLegNumbers = (visits: Visit[]): number[] => {
  const legNumbers = new Set<number>()

  for (const visit of visits) {
    legNumbers.add(visit.legIndex ?? 1)
  }

  return [...legNumbers].sort((left, right) => left - right)
}

export const getLegWinnerIdFromVisits = (
  visits: Visit[],
  legNumber: number,
): string | undefined => {
  const checkoutVisit = [...getVisitsForLeg(visits, legNumber)]
    .reverse()
    .find((visit) => visit.checkout)

  return checkoutVisit?.playerId
}

export const getCurrentLegVisits = (visits: Visit[], matchProgress: MatchProgress): Visit[] =>
  getVisitsForLeg(visits, matchProgress.currentLeg)

export const recordLegWin = (matchProgress: MatchProgress, winnerId: string): MatchProgress => ({
  ...matchProgress,
  legWins: {
    ...matchProgress.legWins,
    [winnerId]: (matchProgress.legWins[winnerId] ?? 0) + 1,
  },
})

export const isSoloLegMatch = (playerCount: number): boolean => playerCount === 1

export const isMatchComplete = (matchProgress: MatchProgress, playerCount: number): boolean => {
  if (isSoloLegMatch(playerCount)) {
    const soloLegsCompleted = Object.values(matchProgress.legWins)[0] ?? 0

    return soloLegsCompleted >= matchProgress.legsToWin
  }

  return Object.values(matchProgress.legWins).some((wins) => wins >= matchProgress.legsToWin)
}

export const advanceToNextLeg = (matchProgress: MatchProgress): MatchProgress => ({
  ...matchProgress,
  currentLeg: matchProgress.currentLeg + 1,
})

export const decrementLegWin = (matchProgress: MatchProgress, winnerId: string): MatchProgress => {
  const currentWins = matchProgress.legWins[winnerId] ?? 0

  return {
    ...matchProgress,
    legWins: {
      ...matchProgress.legWins,
      [winnerId]: Math.max(0, currentWins - 1),
    },
  }
}

export const revertLegWin = (matchProgress: MatchProgress, winnerId: string): MatchProgress => ({
  ...decrementLegWin(matchProgress, winnerId),
  currentLeg: Math.max(1, matchProgress.currentLeg - 1),
})

export const getLegWinnerIdFromX01State = (state: X01State): string | undefined => state.winnerId

export const getMatchWinnerId = (session: GameSession): string | undefined => {
  const { matchProgress, players } = session

  if (matchProgress === undefined || players.length === 0 || isSoloLegMatch(players.length)) {
    return undefined
  }

  for (const player of players) {
    const wins = matchProgress.legWins[player.id] ?? 0

    if (wins >= matchProgress.legsToWin) {
      return player.id
    }
  }

  let topPlayerId: string | undefined = undefined
  let topWins = -1
  let tied = false

  for (const player of players) {
    const wins = matchProgress.legWins[player.id] ?? 0

    if (wins > topWins) {
      topWins = wins
      topPlayerId = player.id
      tied = false
      continue
    }

    if (wins === topWins) {
      tied = true
    }
  }

  return tied ? undefined : topPlayerId
}

export const matchFormatsEqual = (left: MatchFormat, right: MatchFormat): boolean =>
  left.legsToWin === right.legsToWin && left.startingPlayerIndex === right.startingPlayerIndex

export const getWinnerIdForCompletedLeg = (
  mode: GameModeId,
  engineState: unknown,
): string | undefined => {
  if (mode === GameModeId.X01) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- x01 engine state is X01State when mode is X01
    return getLegWinnerIdFromX01State(engineState as X01State)
  }

  return undefined
}
