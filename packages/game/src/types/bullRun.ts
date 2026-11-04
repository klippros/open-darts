export interface BullRunConfig {
  targetScore: number
  /** Points already scored when rebuilding a solo async race after a sync split. */
  startingScore?: number
}

export interface BullRunPlayerState {
  score: number
  dartsThrown: number
}

export interface BullRunState {
  config: BullRunConfig
  players: Record<string, BullRunPlayerState>
  winnerId?: string
}

export enum BullRunOutcome {
  Miss = 'miss',
  Single = 'single',
  Double = 'double',
}
