import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../../types/gameMode'
import type { TenUpOneDownConfig, TenUpOneDownState } from '../../types/tenUpOneDown'
import type { X01Config } from '../../types/x01'
import { sumDartPoints } from '../dartScoring'
import { normalizeCheckoutTarget } from '../x01/x01CheckoutSuggestions'
import { previewX01Remaining } from '../x01/x01Rules'
import { resolveTenUpOneDownVisit } from './tenUpOneDownRules'

const toX01Config = (config: TenUpOneDownConfig): X01Config => ({
  startScore: config.startScore,
  doubleIn: false,
  doubleOut: config.doubleOut,
})

const getPlayerState = (state: TenUpOneDownState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const tenUpOneDownEngine: GameEngine<TenUpOneDownState, TenUpOneDownConfig> = {
  mode: GameModeId.TenUpOneDown,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => {
    const x01Config = toX01Config(config)
    const targetScore = normalizeCheckoutTarget(config.startScore, x01Config, {
      minScore: config.minScore,
      prefer: 'up',
    })

    return {
      config,
      players: Object.fromEntries(players.map((player) => [player.id, { targetScore }])),
    }
  },

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.TenUpOneDown,
    players: players.map((player) => {
      const playerState = getPlayerState(state, player.id)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: playerState.targetScore,
        secondaryLabel: 'Checkout target',
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const remaining = previewX01Remaining(
      playerState.targetScore,
      pendingDarts,
      toX01Config(state.config),
      true,
    )

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          targetScore: remaining,
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<TenUpOneDownState> => {
    const playerState = getPlayerState(state, playerId)
    const scoreBefore = playerState.targetScore
    const outcome = resolveTenUpOneDownVisit(scoreBefore, darts, state.config)

    const visit: VisitResult<TenUpOneDownState>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: outcome.bust ? 0 : sumDartPoints(darts),
      scoreBefore,
      scoreAfter: outcome.targetScoreAfter,
      bust: outcome.bust,
      checkout: outcome.checkout,
      metadata: {
        targetScore: scoreBefore,
        nextTargetScore: outcome.targetScoreAfter,
      },
    }

    const nextState: TenUpOneDownState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          targetScore: outcome.targetScoreAfter,
        },
      },
      winnerId: state.winnerId,
    }

    return {
      state: nextState,
      visit,
      advanceTurn: false,
    }
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveTenUpOneDownVisit(playerState.targetScore, darts, state.config)

    return outcome.checkout || outcome.bust
  },

  isGameComplete: () => false,
}
