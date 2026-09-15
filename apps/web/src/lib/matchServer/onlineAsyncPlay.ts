import { createGameController, restoreGameController } from '@open-darts/game/game/createSession'
import type { AppGameController } from '@open-darts/game/game/createSession'
import type { ScoreboardSnapshot } from '@open-darts/game/game/GameEngine'
import { isX01Config } from '@open-darts/game/game/gameConfigGuards'
import { replaySoloVisits } from '@open-darts/game/game/replaySoloVisits'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { GameConfig, GameModeId } from '@open-darts/game/types/gameMode'
import { GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { getCountingVisits, isCountingVisit } from '@open-darts/game/types/visit'
import type { X01Config } from '@open-darts/game/types/x01'

export interface AsyncPlayerStream {
  visits: Visit[]
  pendingFinalization: boolean
  finalized: boolean
  startScore: number
  finalizeAt: number | null
}

export interface AsyncPlayState {
  dartsOwnerId: string
  players: Record<string, AsyncPlayerStream>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isAsyncPlayerStream = (value: unknown): value is AsyncPlayerStream => {
  if (!isRecord(value)) {
    return false
  }

  return (
    Array.isArray(value.visits) &&
    typeof value.pendingFinalization === 'boolean' &&
    typeof value.finalized === 'boolean' &&
    typeof value.startScore === 'number' &&
    (value.finalizeAt === null || typeof value.finalizeAt === 'number')
  )
}

export const parseAsyncPlayState = (asyncStateJson: string | null): AsyncPlayState | null => {
  if (asyncStateJson === null || asyncStateJson === '') {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(asyncStateJson)
  } catch {
    return null
  }

  if (!isRecord(parsed) || typeof parsed.dartsOwnerId !== 'string' || !isRecord(parsed.players)) {
    return null
  }

  const players: Record<string, AsyncPlayerStream> = {}

  for (const [playerId, stream] of Object.entries(parsed.players)) {
    if (!isAsyncPlayerStream(stream)) {
      return null
    }

    players[playerId] = stream
  }

  return {
    dartsOwnerId: parsed.dartsOwnerId,
    players,
  }
}

export const getAsyncPlayerStream = (
  asyncPlay: AsyncPlayState | null,
  playerId: string,
): AsyncPlayerStream | undefined => asyncPlay?.players[playerId]

export const canThrowInAsyncStream = (input: {
  matchActive: boolean
  stream: AsyncPlayerStream | undefined
}): boolean =>
  input.matchActive &&
  input.stream !== undefined &&
  !input.stream.finalized &&
  !input.stream.pendingFinalization

export const canAmendAsyncVisit = (input: {
  matchActive: boolean
  stream: AsyncPlayerStream | undefined
  pendingDartCount: number
  lastOwnVisit: Visit | undefined
}): boolean =>
  input.matchActive &&
  input.stream !== undefined &&
  !input.stream.finalized &&
  !input.stream.pendingFinalization &&
  input.pendingDartCount === 0 &&
  input.lastOwnVisit !== undefined

export const canPressAsyncUndo = (input: {
  pendingDartCount: number
  canAmend: boolean
  ownPendingFinalization: boolean
  hasLastOwnVisit: boolean
}): boolean => {
  if (input.pendingDartCount > 0) {
    return true
  }

  if (input.ownPendingFinalization) {
    return input.hasLastOwnVisit
  }

  return input.canAmend
}

export const getLastOwnAsyncVisit = (stream: AsyncPlayerStream | undefined): Visit | undefined => {
  if (stream === undefined) {
    return undefined
  }

  return [...getCountingVisits(stream.visits)].at(-1)
}

export const restoreAsyncEntryController = (input: {
  matchId: string
  mode: GameModeId
  config: GameConfig
  playerId: string
  playerName: string
  stream: AsyncPlayerStream
  pendingDarts?: DartThrow[]
  treatPendingAsCompleted?: boolean
}): AppGameController | null => {
  const { mode, config } = input

  if (!isX01Config(mode, config)) {
    return null
  }

  const x01Config: X01Config = {
    ...config,
    startScore: input.stream.startScore,
  }

  const controller = replaySoloVisits(
    createGameController({
      mode,
      config: x01Config,
      players: [
        {
          id: input.playerId,
          name: input.playerName,
          kind: PlayerKind.Human,
        },
      ],
      sessionId: `${input.matchId}:${input.playerId}`,
    }),
    input.stream.visits,
  )

  const pendingDarts = input.pendingDarts ?? []

  if (input.treatPendingAsCompleted === true && input.stream.pendingFinalization) {
    return restoreGameController({
      session: {
        ...controller.session,
        status: GameStatus.Completed,
        completedAt: controller.session.completedAt ?? new Date().toISOString(),
      },
      turnIndex: controller.turnIndex,
      pendingDarts: [],
      savedAt: new Date().toISOString(),
    })
  }

  if (pendingDarts.length === 0) {
    return controller
  }

  return restoreGameController({
    session: controller.session,
    turnIndex: controller.turnIndex,
    pendingDarts,
    savedAt: new Date().toISOString(),
  })
}

export const getAsyncRemainingByPlayerId = (input: {
  matchId: string
  mode: GameModeId
  config: GameConfig
  asyncPlay: AsyncPlayState
}): Record<string, number> => {
  const remaining: Record<string, number> = {}

  for (const [playerId, stream] of Object.entries(input.asyncPlay.players)) {
    const controller = restoreAsyncEntryController({
      matchId: input.matchId,
      mode: input.mode,
      config: input.config,
      playerId,
      playerName: 'Player',
      stream,
    })

    remaining[playerId] = controller?.scoreboard.players[0]?.primaryScore ?? stream.startScore
  }

  return remaining
}

export const buildAsyncScoreboardOverlay = (
  syncScoreboard: ScoreboardSnapshot,
  remainingByPlayerId: Record<string, number>,
  activePlayerId: string | null,
): ScoreboardSnapshot => ({
  mode: syncScoreboard.mode,
  players: syncScoreboard.players.map((player) => ({
    ...player,
    primaryScore: remainingByPlayerId[player.playerId] ?? player.primaryScore,
    isActive: activePlayerId !== null && player.playerId === activePlayerId,
  })),
})

export const mergeAsyncVisitHistory = (
  syncVisits: Visit[],
  asyncPlay: AsyncPlayState,
  currentLeg: number | undefined,
): Visit[] => {
  const nextIndexStart =
    syncVisits.length === 0 ? 0 : Math.max(...syncVisits.map((visit) => visit.visitIndex)) + 1
  let nextIndex = nextIndexStart
  const asyncVisits: Visit[] = []

  for (const stream of Object.values(asyncPlay.players)) {
    for (const visit of stream.visits) {
      if (!isCountingVisit(visit)) {
        continue
      }

      asyncVisits.push({
        ...visit,
        visitIndex: nextIndex,
        ...(currentLeg === undefined ? {} : { legIndex: currentLeg }),
      })
      nextIndex += 1
    }
  }

  return [...syncVisits, ...asyncVisits]
}

export const shouldClearAsyncLocalDraft = (input: {
  matchActive: boolean
  ownPendingFinalization: boolean
}): boolean => !input.matchActive || input.ownPendingFinalization
