export enum NinetyNineDartsTargetKind {
  Number = 'number',
  Bull = 'bull',
}

export type NinetyNineDartsTarget =
  | { kind: NinetyNineDartsTargetKind.Number; value: number }
  | { kind: NinetyNineDartsTargetKind.Bull }

export interface NinetyNineDartsConfig {
  target: NinetyNineDartsTarget
}

export interface NinetyNineDartsPlayerState {
  score: number
  dartsThrown: number
}

export interface NinetyNineDartsState {
  config: NinetyNineDartsConfig
  players: Record<string, NinetyNineDartsPlayerState>
  winnerId?: string
}

export enum NinetyNineDartsOutcome {
  Miss = 'miss',
  Single = 'single',
  Double = 'double',
  Triple = 'triple',
}
