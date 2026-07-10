export interface MatchProgress {
  legsToWin: number
  startingPlayerIndex: number
  currentLeg: number
  legWins: Record<string, number>
}

export const LEGS_TO_WIN_MIN = 1
export const LEGS_TO_WIN_MAX = 15
export const DEFAULT_LEGS_TO_WIN = 2
