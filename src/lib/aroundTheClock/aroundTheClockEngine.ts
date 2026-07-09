import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../../types/gameMode'
import type { AroundTheClockConfig, AroundTheClockState } from '../../types/aroundTheClock'
import { sumDartPoints } from '../dartScoring'
import { getAroundTheClockTargetLabel, resolveAroundTheClockVisit } from './aroundTheClockRules'

const getPlayerState = (state: AroundTheClockState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const aroundTheClockEngine: GameEngine<AroundTheClockState, AroundTheClockConfig> = {
  mode: GameModeId.AroundTheClock,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => ({
    config,
    players: Object.fromEntries(players.map((player) => [player.id, { targetIndex: 0 }])),
  }),

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.AroundTheClock,
    players: players.map((player) => {
      const playerState = getPlayerState(state, player.id)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: playerState.targetIndex >= 20 ? 25 : playerState.targetIndex + 1,
        secondaryLabel: `Target ${getAroundTheClockTargetLabel(playerState.targetIndex)}`,
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveAroundTheClockVisit(playerState.targetIndex, pendingDarts)

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          targetIndex: outcome.targetIndexAfter,
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<AroundTheClockState> => {
    const playerState = getPlayerState(state, playerId)
    const scoreBefore = playerState.targetIndex
    const outcome = resolveAroundTheClockVisit(scoreBefore, darts)

    const visit: VisitResult<AroundTheClockState>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: sumDartPoints(darts),
      scoreBefore,
      scoreAfter: outcome.targetIndexAfter,
      bust: false,
      checkout: outcome.checkout,
      metadata: {
        targetLabel: getAroundTheClockTargetLabel(scoreBefore),
        targetIndexAfter: outcome.targetIndexAfter,
      },
    }

    const nextState: AroundTheClockState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
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
    const outcome = resolveAroundTheClockVisit(playerState.targetIndex, darts)

    return outcome.checkout
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
