import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../types/gameMode'
import type { ClaimTheBoardConfig, ClaimTheBoardState } from '../types/claimTheBoard'
import { getClaimTheBoardConfig } from './claimTheBoardConfig'
import {
  getClaimTheBoardTarget,
  resolveClaimTheBoardVisit,
  resolveClaimTheBoardWinnerId,
} from './claimTheBoardRules'

const getPlayerState = (state: ClaimTheBoardState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

export const claimTheBoardEngine: GameEngine<ClaimTheBoardState, ClaimTheBoardConfig> = {
  mode: GameModeId.ClaimTheBoard,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => ({
    config,
    sharedTargetIndex: 0,
    players: Object.fromEntries(players.map((player) => [player.id, { score: 0 }])),
  }),

  getScoreboard: (state, players, activePlayerId) => {
    const { aimMode } = getClaimTheBoardConfig(state.config)
    const target = getClaimTheBoardTarget(state.sharedTargetIndex, aimMode)

    return {
      mode: GameModeId.ClaimTheBoard,
      players: players.map((player) => {
        const playerState = getPlayerState(state, player.id)

        return {
          playerId: player.id,
          name: player.name,
          primaryScore: playerState.score,
          secondaryLabel: `Target ${target.label}`,
          isActive: player.id === activePlayerId,
        }
      }),
    }
  },

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const { aimMode } = getClaimTheBoardConfig(state.config)
    const outcome = resolveClaimTheBoardVisit(
      playerState.score,
      state.sharedTargetIndex,
      pendingDarts,
      aimMode,
    )

    return {
      ...state,
      sharedTargetIndex: outcome.sharedTargetIndexAfter,
      players: {
        ...state.players,
        [playerId]: {
          score: outcome.scoreAfter,
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<ClaimTheBoardState> => {
    const playerState = getPlayerState(state, playerId)
    const { aimMode } = getClaimTheBoardConfig(state.config)
    const scoreBefore = playerState.score
    const target = getClaimTheBoardTarget(state.sharedTargetIndex, aimMode)
    const outcome = resolveClaimTheBoardVisit(scoreBefore, state.sharedTargetIndex, darts, aimMode)

    const nextPlayers = {
      ...state.players,
      [playerId]: {
        score: outcome.scoreAfter,
      },
    }

    const winnerId = outcome.checkout
      ? resolveClaimTheBoardWinnerId(nextPlayers, playerId)
      : state.winnerId

    const visit: VisitResult<ClaimTheBoardState>['visit'] = {
      visitIndex,
      playerId,
      darts,
      visitScore: outcome.visitScore,
      scoreBefore,
      scoreAfter: outcome.scoreAfter,
      bust: false,
      checkout: outcome.checkout,
      metadata: {
        targetLabel: target.label,
        hit: outcome.hit,
        hitCount: outcome.hitCount,
        sharedTargetIndex: state.sharedTargetIndex,
        sharedTargetIndexAfter: outcome.sharedTargetIndexAfter,
      },
    }

    const nextState: ClaimTheBoardState = {
      ...state,
      sharedTargetIndex: outcome.sharedTargetIndexAfter,
      players: nextPlayers,
      winnerId,
    }

    return {
      state: nextState,
      visit,
      advanceTurn: !outcome.checkout,
    }
  },

  shouldEndVisitEarly: () => false,

  isGameComplete: (state) => state.winnerId !== undefined,
}
