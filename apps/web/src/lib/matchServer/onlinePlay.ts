import { restoreGameController } from '@open-darts/game/game/createSession'
import type { AppGameController } from '@open-darts/game/game/createSession'
import { parseGameSession } from '@open-darts/game/game/serializeGame'
import type { DartThrow } from '@open-darts/game/types/dart'
import { PlayerKind } from '@open-darts/game/types/player'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'
import { readOnlineMatchHistorySession } from '../history/onlineHistorySummary'
import { toPublicDartThrow } from './toPublicDartThrow'
import type { PublicDartThrow, PublicMatchState } from './types'

export interface OnlinePlaySnapshot {
  session: GameSession
  turnIndex: number
  pendingFinalization: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseOnlinePlaySnapshot = (sessionJson: string): OnlinePlaySnapshot => {
  const envelope: unknown = JSON.parse(sessionJson)

  if (isRecord(envelope) && 'session' in envelope && typeof envelope.turnIndex === 'number') {
    return {
      session: parseGameSession(JSON.stringify(envelope.session)),
      turnIndex: envelope.turnIndex,
      pendingFinalization: envelope.pendingFinalization === true,
    }
  }

  const session = parseGameSession(sessionJson)

  return {
    session,
    turnIndex: 0,
    pendingFinalization: false,
  }
}

export const decorateOnlineSessionForViewer = (
  session: GameSession,
  viewerUserId: string,
  viewerDisplayName?: string | null,
  opponentDisplayName?: string | null,
): GameSession => ({
  ...session,
  players: session.players.map((player) => {
    if (player.id === viewerUserId) {
      return {
        ...player,
        name: resolveHumanPlayerName(viewerDisplayName),
        kind: PlayerKind.Human,
      }
    }

    const fallbackName =
      player.name === 'Player 1' || player.name === 'Player 2' ? 'Opponent' : player.name

    return {
      ...player,
      kind: PlayerKind.Remote,
      name:
        opponentDisplayName === undefined || opponentDisplayName === null
          ? fallbackName
          : resolveHumanPlayerName(opponentDisplayName),
    }
  }),
})

export const restoreOnlineController = (
  matchState: PublicMatchState,
  viewerUserId: string,
  viewerDisplayName: string | null | undefined,
  pendingDarts: DartThrow[] = [],
  opponentDisplayName?: string | null,
): AppGameController | null => {
  if (matchState.sessionJson === null) {
    return null
  }

  const snapshot = parseOnlinePlaySnapshot(matchState.sessionJson)
  const session = decorateOnlineSessionForViewer(
    snapshot.session,
    viewerUserId,
    viewerDisplayName,
    opponentDisplayName,
  )
  const turnIndex = matchState.turnIndex ?? snapshot.turnIndex

  return restoreGameController({
    session,
    turnIndex,
    pendingDarts,
    savedAt: new Date().toISOString(),
  })
}

/** Prefer the result-payload session (async reconstructed visits) over the live snapshot. */
export const resolveCompletedOnlineSession = (
  matchState: PublicMatchState,
  fallbackSession: GameSession,
  viewerUserId: string,
  viewerDisplayName?: string | null,
  opponentDisplayName?: string | null,
): GameSession => {
  const fromPayload = readOnlineMatchHistorySession(matchState.resultPayloadJson)

  return decorateOnlineSessionForViewer(
    fromPayload ?? fallbackSession,
    viewerUserId,
    viewerDisplayName,
    opponentDisplayName,
  )
}

export const dartsToPublicPayload = (darts: DartThrow[]): PublicDartThrow[] =>
  darts.map(toPublicDartThrow)
