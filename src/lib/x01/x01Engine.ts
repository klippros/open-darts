import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../../types/gameMode'
import type { X01Config, X01State } from '../../types/x01'
import { previewX01Remaining, resolveX01Visit, getX01VisitScore } from './x01Rules'

const getPlayerState = (state: X01State, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const x01Engine: GameEngine<X01State, X01Config> = {
  mode: GameModeId.X01,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => ({
    config,
    players: Object.fromEntries(
      players.map((player) => [
        player.id,
        {
          remaining: config.startScore,
          hasOpened: !config.doubleIn,
        },
      ]),
    ),
  }),

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.X01,
    players: players.map((player) => ({
      playerId: player.id,
      name: player.name,
      primaryScore: getPlayerState(state, player.id).remaining,
      isActive: player.id === activePlayerId,
    })),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...playerState,
          remaining: previewX01Remaining(
            playerState.remaining,
            pendingDarts,
            state.config,
            playerState.hasOpened,
          ),
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<X01State> => {
    const playerState = getPlayerState(state, playerId)
    const scoreBefore = playerState.remaining
    const outcome = resolveX01Visit(scoreBefore, darts, state.config, playerState.hasOpened)

    const visit: VisitResult<X01State>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: getX01VisitScore(darts),
      scoreBefore,
      scoreAfter: outcome.scoreAfter,
      bust: outcome.bust,
      checkout: outcome.checkout,
    }

    const nextState: X01State = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          remaining: outcome.scoreAfter,
          hasOpened: outcome.opened,
        },
      },
      winnerId: outcome.checkout ? playerId : state.winnerId,
    }

    return {
      state: nextState,
      visit,
      advanceTurn: !outcome.checkout,
    }
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveX01Visit(
      playerState.remaining,
      darts,
      state.config,
      playerState.hasOpened,
    )

    return outcome.checkout || outcome.bust
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
