export enum ChallengeLegEndMode {
  PlayToCheckout = 'play-to-checkout',
  StopAtLimit = 'stop-at-limit',
}

export enum ChallengeLegStatus {
  Won = 'won',
  Lost = 'lost',
  Current = 'current',
  Upcoming = 'upcoming',
}

export interface ChallengeConfig {
  maxVisits: number
  legEndMode: ChallengeLegEndMode
}

export interface MatchProgress {
  legsToWin: number
  startingPlayerIndex: number
  currentLeg: number
  legWins: Record<string, number>
  challenge?: ChallengeConfig
  legLosses?: number
}

export const LEGS_TO_WIN_MIN = 1
export const LEGS_TO_WIN_MAX = 15
export const DEFAULT_LEGS_TO_WIN = 2
