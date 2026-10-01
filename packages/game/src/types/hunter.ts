export interface HunterConfig {
  /**
   * Index into the session players array for the player who starts on field 1
   * (and throws first). The other player starts on 19.
   */
  startingPlayerIndex: number
}

export interface HunterPlayerState {
  /** Index into HUNTER_CLOCK_ORDER (0–19). */
  fieldIndex: number
}

export interface HunterState {
  config: HunterConfig
  players: Record<string, HunterPlayerState>
  winnerId?: string
}

export enum HunterOutcome {
  Miss = 'miss',
  Single = 'single',
  Double = 'double',
  Triple = 'triple',
}
