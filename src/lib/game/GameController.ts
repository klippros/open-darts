import type { DartThrow } from '../../types/dart'
import type { GameSession } from '../../types/gameSession'
import { GameStatus } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import type { GameEngine, ScoreboardSnapshot } from './GameEngine'
import {
  advanceToNextLeg,
  getLegStartingPlayerIndex,
  getWinnerIdForCompletedLeg,
  isMatchComplete,
  recordLegWin,
} from './matchLegs'
import { resolveUndoDartState } from './undoDartStrategy'

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
    return this.session.status === GameStatus.Completed
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
    const undoState = resolveUndoDartState(this.session, this.turnIndex, this.pendingDarts)

    if (undoState === null) {
      return this
    }

    const session: GameSession = {
      ...this.session,
      visits: undoState.visits,
      matchProgress: undoState.matchProgress,
      status: undoState.status,
      completedAt: undoState.completedAt,
      finishedEarly: undoState.finishedEarly,
    }
    const engineState = this.rebuildEngineStateFromVisits(undoState.visits)

    return new GameController(
      session,
      this.engine,
      engineState,
      undoState.pendingDarts,
      undoState.turnIndex,
    )
  }

  finishMatch(): GameController<State, Config> {
    if (this.isComplete) {
      return this
    }

    const withCommittedVisit = this.pendingDarts.length > 0 ? this.commitPendingVisit() : this

    if (withCommittedVisit.isComplete) {
      return withCommittedVisit
    }

    const finishedEarly = !withCommittedVisit.engine.isGameComplete(withCommittedVisit.engineState)

    const session: GameSession = {
      ...withCommittedVisit.session,
      status: GameStatus.Completed,
      completedAt: new Date().toISOString(),
      finishedEarly: finishedEarly ? true : undefined,
    }

    return new GameController(
      session,
      withCommittedVisit.engine,
      withCommittedVisit.engineState,
      [],
      withCommittedVisit.turnIndex,
    )
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

    const legIndex = this.session.matchProgress?.currentLeg
    const visitWithLeg: Visit =
      legIndex === undefined
        ? visit
        : {
            ...visit,
            legIndex,
          }
    const visits = [...this.session.visits, visitWithLeg]
    const isLegComplete = this.engine.isGameComplete(state)
    const { matchProgress } = this.session

    if (isLegComplete && matchProgress !== undefined) {
      const winnerId = getWinnerIdForCompletedLeg(this.session.mode, state)

      if (winnerId !== undefined) {
        const progressAfterWin = recordLegWin(matchProgress, winnerId)

        if (isMatchComplete(progressAfterWin, this.session.players.length)) {
          const session: GameSession = {
            ...this.session,
            visits,
            matchProgress: progressAfterWin,
            status: GameStatus.Completed,
            completedAt: new Date().toISOString(),
          }

          return new GameController(session, this.engine, state, [], this.turnIndex)
        }

        return this.startNextLeg({
          ...this.session,
          visits,
          matchProgress: progressAfterWin,
        })
      }
    }

    const session: GameSession = {
      ...this.session,
      visits,
      status: isLegComplete ? GameStatus.Completed : GameStatus.InProgress,
      completedAt: isLegComplete ? new Date().toISOString() : undefined,
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

  private startNextLeg(session: GameSession): GameController<State, Config> {
    const { matchProgress } = session

    if (matchProgress === undefined) {
      return this
    }

    const nextProgress = advanceToNextLeg(matchProgress)
    const engineState = this.engine.createInitialState(
      session.players,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- session config matches engine config for the active mode
      session.config as Config,
    )
    const turnIndex = getLegStartingPlayerIndex(
      nextProgress.startingPlayerIndex,
      nextProgress.currentLeg,
      session.players.length,
    )
    const nextSession: GameSession = {
      ...session,
      matchProgress: nextProgress,
      status: GameStatus.InProgress,
      completedAt: undefined,
    }

    return new GameController(nextSession, this.engine, engineState, [], turnIndex)
  }

  private getPreviewState(): State {
    if (this.pendingDarts.length === 0) {
      return this.engineState
    }

    return this.engine.applyDart(this.engineState, this.activePlayerId, this.pendingDarts)
  }

  private rebuildEngineStateFromVisits(visits: Visit[]): State {
    const { players, config, matchProgress } = this.session
    const legVisits =
      matchProgress === undefined
        ? visits
        : visits.filter((visit) => (visit.legIndex ?? 1) === matchProgress.currentLeg)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- session config matches engine config for the active mode
    let state = this.engine.createInitialState(players, config as Config)

    for (const visit of legVisits) {
      const { state: nextState } = this.engine.commitVisit(
        state,
        visit.playerId,
        visit.visitIndex,
        visit.darts,
      )
      state = nextState
    }

    return state
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
