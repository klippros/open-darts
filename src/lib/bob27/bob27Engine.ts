import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../../types/gameMode'
import type { Bob27Config, Bob27State } from '../../types/bob27'
import { getBob27Target, isBob27TargetHit, resolveBob27Visit } from './bob27Rules'

const getPlayerState = (state: Bob27State, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const bob27Engine: GameEngine<Bob27State, Bob27Config> = {
  mode: GameModeId.Bob27,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => ({
    config,
    players: Object.fromEntries(
      players.map((player) => [
        player.id,
        {
          score: config.startScore,
          targetIndex: 0,
        },
      ]),
    ),
  }),

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.Bob27,
    players: players.map((player) => {
      const playerState = getPlayerState(state, player.id)
      const target = getBob27Target(playerState.targetIndex)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: playerState.score,
        secondaryLabel: `Target ${target.label}`,
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveBob27Visit(playerState.score, playerState.targetIndex, pendingDarts)

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          score: outcome.scoreAfter,
          targetIndex: outcome.targetIndexAfter,
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<Bob27State> => {
    const playerState = getPlayerState(state, playerId)
    const scoreBefore = playerState.score
    const target = getBob27Target(playerState.targetIndex)
    const outcome = resolveBob27Visit(scoreBefore, playerState.targetIndex, darts)

    const visit: VisitResult<Bob27State>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: outcome.hit ? target.value : -target.value,
      scoreBefore,
      scoreAfter: outcome.scoreAfter,
      bust: false,
      checkout: outcome.checkout,
      metadata: {
        targetLabel: target.label,
        hit: outcome.hit,
      },
    }

    const nextState: Bob27State = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          score: outcome.scoreAfter,
          targetIndex: outcome.targetIndexAfter,
        },
      },
      winnerId: outcome.checkout ? playerId : state.winnerId,
    }

    return {
      state: nextState,
      visit,
      advanceTurn: false,
    }
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)

    return darts.some((dart) => isBob27TargetHit(dart, playerState.targetIndex))
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
