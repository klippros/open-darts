import type { DartThrow } from '../types/dart'
import type { GameEngine, VisitResult } from '../game/GameEngine'
import type { Player } from '../types/player'
import { GameModeId } from '../types/gameMode'
import type { HunterConfig, HunterState } from '../types/hunter'
import type { HunterVisitOutcome } from './hunterRules'
import { getHunterConfig } from './hunterConfig'
import {
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
  getHunterStandingFieldNumber,
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

const getOpponentId = (state: HunterState, playerId: string): string => {
  const opponentId = Object.keys(state.players).find((id) => id !== playerId)

  if (opponentId === undefined) {
    throw new Error('Hunter requires exactly two players')
  }

  return opponentId
}

const resolveStarterPlayerId = (players: Player[], startingPlayerIndex: number): string => {
  const starter = players[startingPlayerIndex] ?? players[0]

  if (starter === undefined) {
    throw new Error('Hunter requires at least one player')
  }

  return starter.id
}

const resolvePlayerVisit = (
  state: HunterState,
  playerId: string,
  darts: DartThrow[],
): { fieldIndexBefore: number; outcome: HunterVisitOutcome } => {
  const playerState = getPlayerState(state, playerId)
  const opponentState = getPlayerState(state, getOpponentId(state, playerId))
  const fieldIndexBefore = playerState.fieldIndex

  return {
    fieldIndexBefore,
    outcome: resolveHunterVisit(fieldIndexBefore, opponentState.fieldIndex, darts),
  }
}

const withPlayerFieldIndex = (
  state: HunterState,
  playerId: string,
  fieldIndex: number,
  winnerId?: string,
): HunterState => ({
  ...state,
  players: {
    ...state.players,
    [playerId]: { fieldIndex },
  },
  ...(winnerId === undefined ? {} : { winnerId }),
})

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
      const aimFieldNumber = getHunterFieldNumber(playerState.fieldIndex)
      const standingFieldNumber = getHunterStandingFieldNumber(aimFieldNumber)

      return {
        playerId: player.id,
        name: player.name,
        primaryScore: aimFieldNumber,
        primaryDisplay: String(aimFieldNumber),
        secondaryLabel: `On ${standingFieldNumber} · hit ${aimFieldNumber}`,
        isActive: player.id === activePlayerId,
      }
    }),
  }),

  applyDart: (state, playerId, pendingDarts) => {
    const { outcome } = resolvePlayerVisit(state, playerId, pendingDarts)

    return withPlayerFieldIndex(
      state,
      playerId,
      outcome.fieldIndexAfter,
      outcome.checkout ? playerId : undefined,
    )
  },

  commitVisit: (state, playerId, visitIndex, darts): VisitResult<HunterState> => {
    const { fieldIndexBefore, outcome } = resolvePlayerVisit(state, playerId, darts)

    return {
      state: withPlayerFieldIndex(
        state,
        playerId,
        outcome.fieldIndexAfter,
        outcome.checkout ? playerId : undefined,
      ),
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
    if (Object.keys(state.players).find((id) => id !== playerId) === undefined) {
      return false
    }

    return resolvePlayerVisit(state, playerId, darts).outcome.checkout
  },

  isGameComplete: (state) => state.winnerId !== undefined,
}
