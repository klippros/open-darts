import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../types/gameMode'
import type { NinetyNineDartsConfig, NinetyNineDartsState } from '../types/ninetyNineDarts'
import { getNinetyNineDartsConfig } from './ninetyNineDartsConfig'
import {
  getNinetyNineDartsTargetLabel,
  NINETY_NINE_DARTS_DART_COUNT,
  NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
  resolveNinetyNineDartsVisit,
} from './ninetyNineDartsRules'

const getPlayerState = (state: NinetyNineDartsState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const ninetyNineDartsEngine: GameEngine<NinetyNineDartsState, NinetyNineDartsConfig> = {
  mode: GameModeId.NinetyNineDarts,
  maxDartsPerVisit: NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,

  createInitialState: (players, config) => ({
    config: getNinetyNineDartsConfig(config),
    players: Object.fromEntries(
      players.map((player) => [
        player.id,
        {
          score: 0,
          dartsThrown: 0,
        },
      ]),
    ),
  }),

  getScoreboard: (state, players, activePlayerId) => {
    const { target } = getNinetyNineDartsConfig(state.config)
    const targetLabel = getNinetyNineDartsTargetLabel(target)

    return {
      mode: GameModeId.NinetyNineDarts,
      players: players.map((player) => {
        const playerState = getPlayerState(state, player.id)
        const dartsRemaining = Math.max(0, NINETY_NINE_DARTS_DART_COUNT - playerState.dartsThrown)

        return {
          playerId: player.id,
          name: player.name,
          primaryScore: playerState.score,
          secondaryLabel: `${dartsRemaining} left · ${targetLabel}`,
          isActive: player.id === activePlayerId,
        }
      }),
    }
  },

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const { target } = getNinetyNineDartsConfig(state.config)
    const outcome = resolveNinetyNineDartsVisit(
      playerState.score,
      playerState.dartsThrown,
      pendingDarts,
      target,
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
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<NinetyNineDartsState> => {
    const playerState = getPlayerState(state, playerId)
    const { target } = getNinetyNineDartsConfig(state.config)
    const scoreBefore = playerState.score
    const outcome = resolveNinetyNineDartsVisit(scoreBefore, playerState.dartsThrown, darts, target)

    const visit: VisitResult<NinetyNineDartsState>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: outcome.visitScore,
      scoreBefore,
      scoreAfter: outcome.scoreAfter,
      bust: false,
      checkout: outcome.checkout,
      metadata: {
        targetLabel: getNinetyNineDartsTargetLabel(target),
      },
    }

    const nextState: NinetyNineDartsState = {
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
      visit,
      advanceTurn: false,
    }
  },

  shouldEndVisitEarly: () => false,

  isGameComplete: (state) => state.winnerId !== undefined,
}
