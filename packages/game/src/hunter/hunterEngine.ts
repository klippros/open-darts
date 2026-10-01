import type { GameEngine, VisitResult } from '../game/GameEngine'
import type { Player } from '../types/player'
import { GameModeId } from '../types/gameMode'
import type { HunterConfig, HunterState } from '../types/hunter'
import { getHunterConfig } from './hunterConfig'
import {
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
  HUNTER_SECOND_FIELD,
  HUNTER_STARTER_FIELD,
} from './hunterClock'
import { HUNTER_MAX_DARTS_PER_VISIT, resolveHunterVisit } from './hunterRules'

const getPlayerState = (state: HunterState, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

const resolveStarterPlayerId = (players: Player[], startingPlayerIndex: number): string => {
  const starter = players[startingPlayerIndex] ?? players[0]

  if (starter === undefined) {
    throw new Error('Hunter requires at least one player')
  }

  return starter.id
}

export const hunterEngine: GameEngine<HunterState, HunterConfig> = {
  mode: GameModeId.Hunter,
  maxDartsPerVisit: HUNTER_MAX_DARTS_PER_VISIT,

  createInitialState: (players, config) => {
    const { startingPlayerIndex } = getHunterConfig(config)
    const starterId = resolveStarterPlayerId(players, startingPlayerIndex)
    const starterFieldIndex = getHunterFieldIndexForNumber(HUNTER_STARTER_FIELD)
    const secondFieldIndex = getHunterFieldIndexForNumber(HUNTER_SECOND_FIELD)

    return {
      config,
      players: Object.fromEntries(
        players.map((player) => [
          player.id,
          {
            fieldIndex: player.id === starterId ? starterFieldIndex : secondFieldIndex,
          },
        ]),
      ),
    }
  },

  getScoreboard: (state, players, activePlayerId) => ({
    mode: GameModeId.Hunter,
    players: players.map((player) => {
      const playerState = getPlayerState(state, player.id)
      const fieldNumber = getHunterFieldNumber(playerState.fieldIndex)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: fieldNumber,
        primaryDisplay: String(fieldNumber),
        secondaryLabel: `On ${fieldNumber}`,
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const playerState = getPlayerState(state, playerId)
    const opponentId = Object.keys(state.players).find((id) => id !== playerId)

    if (opponentId === undefined) {
      throw new Error('Hunter requires exactly two players')
    }

    const opponentState = getPlayerState(state, opponentId)
    const outcome = resolveHunterVisit(
      playerState.fieldIndex,
      opponentState.fieldIndex,
      pendingDarts,
    )

    const nextState: HunterState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          fieldIndex: outcome.fieldIndexAfter,
        },
      },
    }

    if (outcome.checkout) {
      nextState.winnerId = playerId
    }

    return nextState
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<HunterState> => {
    const playerState = getPlayerState(state, playerId)
    const opponentId = Object.keys(state.players).find((id) => id !== playerId)

    if (opponentId === undefined) {
      throw new Error('Hunter requires exactly two players')
    }

    const opponentState = getPlayerState(state, opponentId)
    const fieldIndexBefore = playerState.fieldIndex
    const outcome = resolveHunterVisit(fieldIndexBefore, opponentState.fieldIndex, darts)

    const nextState: HunterState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          fieldIndex: outcome.fieldIndexAfter,
        },
      },
      ...(outcome.checkout ? { winnerId: playerId } : {}),
    }

    return {
      state: nextState,
      visit: {
        visitIndex,
        playerId,
        darts,
        visitScore: outcome.visitScore,
        scoreBefore: getHunterFieldNumber(fieldIndexBefore),
        scoreAfter: getHunterFieldNumber(outcome.fieldIndexAfter),
        bust: false,
        checkout: outcome.checkout,
        metadata: {
          fieldIndex: fieldIndexBefore,
          fieldIndexAfter: outcome.fieldIndexAfter,
          fieldNumber: getHunterFieldNumber(fieldIndexBefore),
          fieldNumberAfter: getHunterFieldNumber(outcome.fieldIndexAfter),
          advances: outcome.advances,
          catch: outcome.checkout,
        },
      },
      advanceTurn: !outcome.checkout,
    }
  },

  shouldEndVisitEarly: (state, playerId, darts) => {
    const playerState = getPlayerState(state, playerId)
    const opponentId = Object.keys(state.players).find((id) => id !== playerId)

    if (opponentId === undefined) {
      return false
    }

    const opponentState = getPlayerState(state, opponentId)
    return resolveHunterVisit(playerState.fieldIndex, opponentState.fieldIndex, darts).checkout
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
