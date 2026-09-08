import { resolveAsyncMatchResult } from '@open-darts/game'
import { createGameController, restoreGameController } from '@open-darts/game/game/createSession'
import type { AppGameController } from '@open-darts/game/game/createSession'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import type { X01Config, X01State } from '@open-darts/game/types/x01'
import { isRecord } from '../json'
import { loadController } from './sessionPlay'
import type { StoredPlayState } from './sessionPlay'

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

export const isAsyncPlayState = (value: unknown): value is AsyncPlayState => {
  if (!isRecord(value) || typeof value.dartsOwnerId !== 'string' || !isRecord(value.players)) {
    return false
  }

  for (const stream of Object.values(value.players)) {
    if (
      !isRecord(stream) ||
      !Array.isArray(stream.visits) ||
      typeof stream.pendingFinalization !== 'boolean' ||
      typeof stream.finalized !== 'boolean' ||
      typeof stream.startScore !== 'number' ||
      (stream.finalizeAt !== null && typeof stream.finalizeAt !== 'number')
    ) {
      return false
    }
  }

  return true
}

const asX01Config = (config: GameConfig): X01Config =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- online v1 config is X01
  config as X01Config

const countingVisits = (visits: Visit[]): Visit[] => visits.filter((visit) => visit.voided !== true)

export const anyAsyncPendingFinalization = (asyncPlay: AsyncPlayState): boolean =>
  Object.values(asyncPlay.players).some((stream) => stream.pendingFinalization)

export const earliestAsyncFinalizeAt = (asyncPlay: AsyncPlayState): number | null => {
  let earliest: number | null = null

  for (const stream of Object.values(asyncPlay.players)) {
    if (!stream.pendingFinalization || stream.finalizeAt === null) {
      continue
    }

    if (earliest === null || stream.finalizeAt < earliest) {
      earliest = stream.finalizeAt
    }
  }

  return earliest
}

export const bothAsyncPlayersFinalized = (asyncPlay: AsyncPlayState): boolean => {
  const streams = Object.values(asyncPlay.players)

  return streams.length === 2 && streams.every((stream) => stream.finalized)
}

export const createAsyncPlayFromSync = (play: StoredPlayState): AsyncPlayState => {
  const controller = loadController(play)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- sync online play is X01
  const x01State = controller.engineState as X01State
  const config = asX01Config(play.session.config)
  const players: Record<string, AsyncPlayerStream> = {}

  for (const player of play.session.players) {
    players[player.id] = {
      visits: [],
      pendingFinalization: false,
      finalized: false,
      startScore: x01State.players[player.id]?.remaining ?? config.startScore,
      finalizeAt: null,
    }
  }

  return {
    dartsOwnerId: controller.activePlayerId,
    players,
  }
}

const rebuildAsyncController = (
  play: StoredPlayState,
  playerId: string,
  stream: AsyncPlayerStream,
  treatPendingAsCompleted: boolean,
): AppGameController => {
  const config = {
    ...asX01Config(play.session.config),
    startScore: stream.startScore,
  }
  let controller = createGameController({
    mode: play.session.mode,
    config,
    players: [
      {
        id: playerId,
        name: 'Player',
        kind: PlayerKind.Remote,
      },
    ],
    sessionId: `${play.session.id}:${playerId}`,
  })

  for (const visit of countingVisits(stream.visits)) {
    const next =
      visit.darts.length > 0
        ? controller.recordDarts(visit.darts)
        : controller.recordVisitScore(visit.visitScore)

    if (next.session.visits.length === controller.session.visits.length) {
      return controller
    }

    controller = next
  }

  if (treatPendingAsCompleted && stream.pendingFinalization) {
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

  return controller
}

const requireAsyncStream = (
  play: StoredPlayState,
  actorUserId: string,
):
  | { ok: true; asyncPlay: AsyncPlayState; stream: AsyncPlayerStream }
  | { ok: false; reason: string } => {
  const asyncPlay = play.asyncPlay

  if (asyncPlay === undefined) {
    return { ok: false, reason: 'Match is not in async play' }
  }

  const stream = asyncPlay.players[actorUserId]

  if (stream === undefined) {
    return { ok: false, reason: 'Player is not in async play' }
  }

  return { ok: true, asyncPlay, stream }
}

const withUpdatedStream = (
  play: StoredPlayState,
  asyncPlay: AsyncPlayState,
  actorUserId: string,
  stream: AsyncPlayerStream,
): StoredPlayState => ({
  ...play,
  pendingFinalization: anyAsyncPendingFinalization({
    ...asyncPlay,
    players: { ...asyncPlay.players, [actorUserId]: stream },
  }),
  asyncPlay: {
    ...asyncPlay,
    players: {
      ...asyncPlay.players,
      [actorUserId]: stream,
    },
  },
})

const afterAsyncCommit = (
  play: StoredPlayState,
  asyncPlay: AsyncPlayState,
  actorUserId: string,
  stream: AsyncPlayerStream,
  previous: AppGameController,
  next: AppGameController,
  finalizeTimeoutMs: number,
  now: number,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  if (next.session.visits.length === previous.session.visits.length) {
    return { ok: false, reason: 'Visit was not accepted' }
  }

  const pendingFinalization = next.session.status === GameStatus.Completed
  const updated: AsyncPlayerStream = {
    ...stream,
    visits: next.session.visits,
    pendingFinalization,
    finalized: false,
    finalizeAt: pendingFinalization ? now + finalizeTimeoutMs : null,
  }

  return { ok: true, play: withUpdatedStream(play, asyncPlay, actorUserId, updated) }
}

export const applyAsyncRecordDarts = (
  play: StoredPlayState,
  actorUserId: string,
  darts: DartThrow[],
  finalizeTimeoutMs: number,
  now = Date.now(),
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  const required = requireAsyncStream(play, actorUserId)

  if (!required.ok) {
    return required
  }

  const { asyncPlay, stream } = required

  if (stream.finalized) {
    return { ok: false, reason: 'Your async game is already finalized' }
  }

  if (stream.pendingFinalization) {
    return { ok: false, reason: 'Match is waiting to be finalized' }
  }

  const controller = rebuildAsyncController(play, actorUserId, stream, false)

  return afterAsyncCommit(
    play,
    asyncPlay,
    actorUserId,
    stream,
    controller,
    controller.recordDarts(darts),
    finalizeTimeoutMs,
    now,
  )
}

export const applyAsyncRecordVisitScore = (
  play: StoredPlayState,
  actorUserId: string,
  score: number,
  finalizeTimeoutMs: number,
  now = Date.now(),
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  const required = requireAsyncStream(play, actorUserId)

  if (!required.ok) {
    return required
  }

  const { asyncPlay, stream } = required

  if (stream.finalized) {
    return { ok: false, reason: 'Your async game is already finalized' }
  }

  if (stream.pendingFinalization) {
    return { ok: false, reason: 'Match is waiting to be finalized' }
  }

  const controller = rebuildAsyncController(play, actorUserId, stream, false)

  return afterAsyncCommit(
    play,
    asyncPlay,
    actorUserId,
    stream,
    controller,
    controller.recordVisitScore(score),
    finalizeTimeoutMs,
    now,
  )
}

export const applyAsyncUndoVisit = (
  play: StoredPlayState,
  actorUserId: string,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  const required = requireAsyncStream(play, actorUserId)

  if (!required.ok) {
    return required
  }

  const { asyncPlay, stream } = required

  if (stream.finalized) {
    return { ok: false, reason: 'Your async game is already finalized' }
  }

  if (countingVisits(stream.visits).length === 0) {
    return { ok: false, reason: 'No visit to undo' }
  }

  const controller = rebuildAsyncController(play, actorUserId, stream, stream.pendingFinalization)
  let next = controller
  const visitCountBefore = countingVisits(next.session.visits).length

  while (countingVisits(next.session.visits).length === visitCountBefore) {
    const undone = next.undoDart()

    if (undone === next) {
      return { ok: false, reason: 'Unable to undo visit' }
    }

    next = undone
  }

  while (next.pendingDarts.length > 0) {
    const cleared = next.undoDart()

    if (cleared === next) {
      break
    }

    next = cleared
  }

  const updated: AsyncPlayerStream = {
    ...stream,
    visits: next.session.visits,
    pendingFinalization: false,
    finalized: false,
    finalizeAt: null,
  }

  return { ok: true, play: withUpdatedStream(play, asyncPlay, actorUserId, updated) }
}

export const finalizeAsyncPlayer = (
  play: StoredPlayState,
  actorUserId: string,
): { ok: true; play: StoredPlayState } | { ok: false; reason: string } => {
  const required = requireAsyncStream(play, actorUserId)

  if (!required.ok) {
    return required
  }

  const { asyncPlay, stream } = required

  if (stream.finalized) {
    return { ok: false, reason: 'Your async game is already finalized' }
  }

  if (!stream.pendingFinalization) {
    return { ok: false, reason: 'Match is not waiting to be finalized' }
  }

  const updated: AsyncPlayerStream = {
    ...stream,
    pendingFinalization: false,
    finalized: true,
    finalizeAt: null,
  }

  return { ok: true, play: withUpdatedStream(play, asyncPlay, actorUserId, updated) }
}

export const autoFinalizeDueAsyncPlayers = (
  play: StoredPlayState,
  now: number,
): StoredPlayState => {
  const asyncPlay = play.asyncPlay

  if (asyncPlay === undefined) {
    return play
  }

  const players: Record<string, AsyncPlayerStream> = { ...asyncPlay.players }

  for (const [playerId, stream] of Object.entries(players)) {
    if (
      stream.pendingFinalization &&
      !stream.finalized &&
      stream.finalizeAt !== null &&
      stream.finalizeAt <= now
    ) {
      players[playerId] = {
        ...stream,
        pendingFinalization: false,
        finalized: true,
        finalizeAt: null,
      }
    }
  }

  const nextAsync: AsyncPlayState = { ...asyncPlay, players }

  return {
    ...play,
    pendingFinalization: anyAsyncPendingFinalization(nextAsync),
    asyncPlay: nextAsync,
  }
}

export const markPendingAsyncPlayersFinalized = (play: StoredPlayState): StoredPlayState => {
  const asyncPlay = play.asyncPlay

  if (asyncPlay === undefined) {
    return play
  }

  const players: Record<string, AsyncPlayerStream> = { ...asyncPlay.players }

  for (const [playerId, stream] of Object.entries(players)) {
    if (stream.pendingFinalization && !stream.finalized) {
      players[playerId] = {
        ...stream,
        pendingFinalization: false,
        finalized: true,
        finalizeAt: null,
      }
    }
  }

  const nextAsync: AsyncPlayState = { ...asyncPlay, players }

  return {
    ...play,
    pendingFinalization: false,
    asyncPlay: nextAsync,
  }
}

export const resolveAsyncCompletion = (
  play: StoredPlayState,
): { winnerUserId: string; visits: Visit[] } | null => {
  const asyncPlay = play.asyncPlay

  if (asyncPlay === undefined || !bothAsyncPlayersFinalized(asyncPlay)) {
    return null
  }

  const playerIds = Object.keys(asyncPlay.players)

  if (playerIds.length !== 2) {
    return null
  }

  const firstId = playerIds[0]
  const secondId = playerIds[1]

  if (firstId === undefined || secondId === undefined) {
    return null
  }

  const first = asyncPlay.players[firstId]
  const second = asyncPlay.players[secondId]

  if (first === undefined || second === undefined) {
    return null
  }

  const result = resolveAsyncMatchResult({
    dartsOwnerId: asyncPlay.dartsOwnerId,
    players: [
      { playerId: firstId, visits: first.visits },
      { playerId: secondId, visits: second.visits },
    ],
  })

  return { winnerUserId: result.winnerId, visits: result.visits }
}

export const asyncPlayerIdsByFinalized = (
  asyncPlay: AsyncPlayState,
): { finalized: string[]; unfinished: string[] } => {
  const finalized: string[] = []
  const unfinished: string[] = []

  for (const [playerId, stream] of Object.entries(asyncPlay.players)) {
    if (stream.finalized || stream.pendingFinalization) {
      finalized.push(playerId)
    } else {
      unfinished.push(playerId)
    }
  }

  return { finalized, unfinished }
}
