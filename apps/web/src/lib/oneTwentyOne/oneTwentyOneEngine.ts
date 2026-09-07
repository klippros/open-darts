import type { GameEngine, VisitResult } from '../game/GameEngine'
import { GameModeId } from '../../types/gameMode'
import type { OneTwentyOneConfig, OneTwentyOneState } from '../../types/oneTwentyOne'
import { VisitInputMode } from '../../types/visit'
import { sumDartPoints } from '../dartScoring'
import { normalizeCheckoutTarget } from '../checkout/checkoutSuggestions'
import { previewX01Remaining, resolveX01Visit } from '../x01/x01Rules'
import { toOneTwentyOneCheckoutRules, toOneTwentyOneX01Config } from './oneTwentyOneConfig'
import {
  resolveOneTwentyOneRoundVisit,
  resolveOneTwentyOneRoundVisitScore,
} from './oneTwentyOneRules'

const getPlayerState = (state: OneTwentyOneState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

const createPlayerState = (
  config: OneTwentyOneConfig,
  roundTarget: number,
): OneTwentyOneState['players'][string] => ({
  roundTarget,
  remaining: roundTarget,
  lives: config.startingLives,
  visitsOnTarget: 0,
  peakTarget: roundTarget,
})

const buildVisitResult = (
  state: OneTwentyOneState,
  playerId: string,
  visitIndex: number,
  outcome: ReturnType<typeof resolveOneTwentyOneRoundVisit>,
  darts: VisitResult<OneTwentyOneState>['visit']['darts'],
  visitScore: number,
  inputMode?: VisitInputMode,
): VisitResult<OneTwentyOneState> => {
  const playerState = getPlayerState(state, playerId)
  const scoreBefore = playerState.remaining

  const visit: VisitResult<OneTwentyOneState>['visit'] = {
    visitIndex,
    playerId,
    darts,
    visitScore: outcome.bust ? 0 : visitScore,
    scoreBefore,
    scoreAfter: outcome.remainingAfter,
    bust: outcome.bust,
    checkout: outcome.checkout,
    ...(inputMode === undefined ? {} : { inputMode }),
    metadata: {
      roundTarget: playerState.roundTarget,
      roundTargetAfter: outcome.roundTargetAfter,
      remainingAfter: outcome.remainingAfter,
      livesAfter: outcome.livesAfter,
      peakTargetAfter: outcome.peakTargetAfter,
      roundFailed: outcome.roundFailed,
      lifeGained: outcome.lifeGained,
      lifeLost: outcome.lifeLost,
      visitsOnTargetAfter: outcome.visitsOnTargetAfter,
    },
  }

  const nextState: OneTwentyOneState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        roundTarget: outcome.roundTargetAfter,
        remaining: outcome.remainingAfter,
        lives: outcome.livesAfter,
        visitsOnTarget: outcome.visitsOnTargetAfter,
        peakTarget: outcome.peakTargetAfter,
      },
    },
    winnerId: state.winnerId,
  }

  return {
    state: nextState,
    visit,
    advanceTurn: false,
  }
}

export const oneTwentyOneEngine: GameEngine<OneTwentyOneState, OneTwentyOneConfig> = {
  mode: GameModeId.OneTwentyOne,
  maxDartsPerVisit: 3,

  createInitialState: (players, config) => {
    const checkoutRules = toOneTwentyOneCheckoutRules(config)
    const roundTarget = normalizeCheckoutTarget(config.startScore, checkoutRules, { prefer: 'up' })

    return {
      config,
      players: Object.fromEntries(
        players.map((player) => [player.id, createPlayerState(config, roundTarget)]),
      ),
    }
  },

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.OneTwentyOne,
    players: players.map((player) => {
      const playerState = getPlayerState(state, player.id)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: playerState.remaining,
        lives: playerState.lives,
        visitsOnTarget: playerState.visitsOnTarget,
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const remaining = previewX01Remaining(
      playerState.remaining,
      pendingDarts,
      toOneTwentyOneX01Config(state.config),
      true,
    )

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...playerState,
          remaining,
        },
      },
    }
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<OneTwentyOneState> => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveOneTwentyOneRoundVisit(
      {
        roundTarget: playerState.roundTarget,
        remaining: playerState.remaining,
        visitsOnTarget: playerState.visitsOnTarget,
        lives: playerState.lives,
        peakTarget: playerState.peakTarget,
      },
      darts,
      state.config,
    )

    return buildVisitResult(state, playerId, visitIndex, outcome, darts, sumDartPoints(darts))
  },

  commitVisitScore: (state, playerId, visitIndex, score): VisitResult<OneTwentyOneState> => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveOneTwentyOneRoundVisitScore(
      {
        roundTarget: playerState.roundTarget,
        remaining: playerState.remaining,
        visitsOnTarget: playerState.visitsOnTarget,
        lives: playerState.lives,
        peakTarget: playerState.peakTarget,
      },
      score,
      state.config,
    )

    return buildVisitResult(
      state,
      playerId,
      visitIndex,
      outcome,
      [],
      score,
      VisitInputMode.VisitScore,
    )
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)
    const outcome = resolveX01Visit(
      playerState.remaining,
      darts,
      toOneTwentyOneX01Config(state.config),
      true,
    )

    return outcome.checkout || outcome.bust
  },

  isGameComplete: (state) =>
    Object.values(state.players).some((playerState) => playerState.lives <= 0),
}
