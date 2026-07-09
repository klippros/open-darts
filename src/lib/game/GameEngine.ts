import type { DartThrow } from '../../types/dart'
import type { GameModeId } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'

export interface ScoreboardPlayerEntry {
  playerId: string
  name: string
  primaryScore: number
  secondaryLabel?: string
  isActive: boolean
}

export interface ScoreboardSnapshot {
  mode: GameModeId
  players: ScoreboardPlayerEntry[]
}

export interface VisitResult<State> {
  state: State
  visit: Visit
  advanceTurn: boolean
}

export interface GameEngine<State, Config> {
  readonly mode: GameModeId
  readonly maxDartsPerVisit: number
  createInitialState: (players: Player[], config: Config) => State
  getScoreboard: (state: State, players: Player[], activePlayerId: string) => ScoreboardSnapshot
  applyDart: (state: State, playerId: string, pendingDarts: DartThrow[]) => State
  commitVisit: (
    state: State,
    playerId: string,
    visitIndex: number,
    darts: DartThrow[],
  ) => VisitResult<State>
  shouldEndVisitEarly: (state: State, playerId: string, darts: DartThrow[]) => boolean
  isGameComplete: (state: State) => boolean
}
