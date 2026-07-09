import type { DartThrow } from '../../types/dart'
import type { GameSession } from '../../types/gameSession'
import { GameStatus } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import type { GameEngine, ScoreboardSnapshot } from './GameEngine'

export class GameController<State, Config> {
  readonly session: GameSession
  readonly engineState: State
  readonly pendingDarts: DartThrow[]
  readonly turnIndex: number

  private readonly engine: GameEngine<State, Config>

  constructor(
    session: GameSession,
    engine: GameEngine<State, Config>,
    engineState: State,
    pendingDarts: DartThrow[],
    turnIndex: number,
  ) {
    this.session = session
    this.engine = engine
    this.engineState = engineState
    this.pendingDarts = pendingDarts
    this.turnIndex = turnIndex
  }

  get activePlayer(): Player {
    const player = this.session.players[this.turnIndex]

    if (player === undefined) {
      throw new Error(`No player at turn index ${this.turnIndex}`)
    }

    return player
  }

  get activePlayerId(): string {
    return this.activePlayer.id
  }

  get isComplete(): boolean {
    return (
      this.session.status === GameStatus.Completed || this.engine.isGameComplete(this.engineState)
    )
  }

  get scoreboard(): ScoreboardSnapshot {
    const previewState = this.getPreviewState()

    return this.engine.getScoreboard(previewState, this.session.players, this.activePlayerId)
  }

  recordDart(dart: DartThrow): GameController<State, Config> {
    if (this.isComplete) {
      return this
    }

    const pendingDarts = [...this.pendingDarts, dart]
    const shouldCommit =
      pendingDarts.length >= this.engine.maxDartsPerVisit ||
      this.engine.shouldEndVisitEarly(this.engineState, this.activePlayerId, pendingDarts)

    if (shouldCommit) {
      return this.commitPendingVisit(pendingDarts)
    }

    return this.clone({ pendingDarts })
  }

  undoDart(): GameController<State, Config> {
    if (this.pendingDarts.length === 0 || this.isComplete) {
      return this
    }

    return this.clone({ pendingDarts: this.pendingDarts.slice(0, -1) })
  }

  commitPendingVisit(pendingDarts = this.pendingDarts): GameController<State, Config> {
    if (pendingDarts.length === 0 || this.isComplete) {
      return this
    }

    const visitIndex = this.session.visits.length
    const { state, visit, advanceTurn } = this.engine.commitVisit(
      this.engineState,
      this.activePlayerId,
      visitIndex,
      pendingDarts,
    )

    const visits = [...this.session.visits, visit]
    const isComplete = this.engine.isGameComplete(state)

    const session: GameSession = {
      ...this.session,
      visits,
      status: isComplete ? GameStatus.Completed : GameStatus.InProgress,
      completedAt: isComplete ? new Date().toISOString() : undefined,
    }

    const nextTurnIndex = advanceTurn
      ? (this.turnIndex + 1) % this.session.players.length
      : this.turnIndex

    return new GameController(session, this.engine, state, [], nextTurnIndex)
  }

  withSession(
    session: GameSession,
    engineState: State,
    turnIndex: number,
  ): GameController<State, Config> {
    return new GameController(session, this.engine, engineState, [], turnIndex)
  }

  private getPreviewState(): State {
    if (this.pendingDarts.length === 0) {
      return this.engineState
    }

    return this.engine.applyDart(this.engineState, this.activePlayerId, this.pendingDarts)
  }

  private clone(overrides: {
    pendingDarts?: DartThrow[]
    turnIndex?: number
  }): GameController<State, Config> {
    return new GameController(
      this.session,
      this.engine,
      this.engineState,
      overrides.pendingDarts ?? this.pendingDarts,
      overrides.turnIndex ?? this.turnIndex,
    )
  }
}

export type { Visit, ScoreboardSnapshot }
