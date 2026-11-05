import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../types/gameMode'
import type { BullRunConfig, BullRunState } from '../types/bullRun'
import { getBullRunConfig } from './bullRunConfig'
import { BULL_RUN_MAX_DARTS_PER_VISIT, resolveBullRunVisit } from './bullRunRules'

const getPlayerState = (state: BullRunState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const bullRunEngine: GameEngine<BullRunState, BullRunConfig> = {
  mode: GameModeId.BullRun,
  maxDartsPerVisit: BULL_RUN_MAX_DARTS_PER_VISIT,

  createInitialState: (players, config) => {
    const normalized = getBullRunConfig(config)
    const startingScore = normalized.startingScore ?? 0

    return {
      config: normalized,
      players: Object.fromEntries(
        players.map((player) => [
          player.id,
          {
            score: startingScore,
            dartsThrown: 0,
          },
        ]),
      ),
    }
  },

  getScoreboard: (state, players, activePlayerId) => {
    const { targetScore } = getBullRunConfig(state.config)

    return {
      mode: GameModeId.BullRun,
      players: players.map((player) => {
        const playerState = getPlayerState(state, player.id)

        return {
          playerId: player.id,
          name: player.name,
          primaryScore: playerState.score,
          secondaryLabel: `Target ${targetScore}`,
          isActive: player.id === activePlayerId,
        }
      }),
    }
  },

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const { targetScore } = getBullRunConfig(state.config)
    const outcome = resolveBullRunVisit(
      playerState.score,
      playerState.dartsThrown,
      pendingDarts,
      targetScore,
    )

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          score: outcome.scoreAfter,
          dartsThrown: outcome.dartsThrownAfter,
        },
      },
      winnerId: outcome.checkout ? playerId : state.winnerId,
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<BullRunState> => {
    const playerState = getPlayerState(state, playerId)
    const { targetScore } = getBullRunConfig(state.config)
    const scoreBefore = playerState.score
    const outcome = resolveBullRunVisit(scoreBefore, playerState.dartsThrown, darts, targetScore)

    const nextState: BullRunState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          score: outcome.scoreAfter,
          dartsThrown: outcome.dartsThrownAfter,
        },
      },
      winnerId: outcome.checkout ? playerId : state.winnerId,
    }

    return {
      state: nextState,
      visit: {
        visitIndex,
        playerId,
        darts,
        visitScore: outcome.visitScore,
        scoreBefore,
        scoreAfter: outcome.scoreAfter,
        bust: false,
        checkout: outcome.checkout,
        metadata: {
          targetScore,
        },
      },
      advanceTurn: !outcome.checkout,
    }
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)
    const { targetScore } = getBullRunConfig(state.config)
    const outcome = resolveBullRunVisit(
      playerState.score,
      playerState.dartsThrown,
      darts,
      targetScore,
    )

    return outcome.checkout
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
