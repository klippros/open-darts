import { getAroundTheClockConfig } from '../aroundTheClock/aroundTheClockConfig'
import { resolveAroundTheClockVisit } from '../aroundTheClock/aroundTheClockRules'
import {
  buildDartsForMissAll,
  buildDartsForOrdinalHit,
  getAroundTheClockDartsLeft,
} from '../aroundTheClock/buildAroundTheClockDarts'
import type { AroundTheClockDartOrdinal } from '../aroundTheClock/buildAroundTheClockDarts'
import { buildBob27DartsForHitCount } from '../bob27/buildBob27Darts'
import type { AppGameController } from '../game/createSession'
import { isAroundTheClockConfig } from '../game/gameConfigGuards'
import { getGameModePickerTargets } from '../game/getGameModePickerTargets'
import type { DartThrow } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import type { AroundTheClockOutcome } from './grammars/aroundTheClockGrammar'
import { VoiceIntentKind } from './parseVoiceCommand'
import type { VoiceGameplayIntent, VoiceIntent } from './parseVoiceCommand'
import { createVoiceFingerprint } from './voiceUndoHistory'
import type { VoiceFingerprint, VoiceUndoHistory } from './voiceUndoHistory'

const toAroundTheClockOrdinal = (value: number): AroundTheClockDartOrdinal | null => {
  if (value === 1 || value === 2 || value === 3) {
    return value
  }

  return null
}

export type VoicePlaybackSound = 'hit' | 'miss'
/** Ordered UI sounds for a committed voice command; null means undo-only (no hit/miss). */
export type VoicePlayback = VoicePlaybackSound[] | null

export interface VoiceExecuteResult {
  next: AppGameController
  /** State used as the baseline for visit-commit score-caller notifications. */
  scoreCallerBase: AppGameController
  /** History mutations to apply after a successful live commit. */
  commitHistory: (history: VoiceUndoHistory) => void
  /** Whether onUndo should run (undo or fix). */
  didUndo: boolean
  playback: VoicePlayback
}

const fingerprintOf = (controller: AppGameController): VoiceFingerprint =>
  createVoiceFingerprint(controller.session.visits.length, controller.pendingDarts.length)

const countAppliedDarts = (before: AppGameController, after: AppGameController): number => {
  const visitDelta = after.session.visits.length - before.session.visits.length

  if (visitDelta > 0) {
    const committed = after.session.visits.slice(-visitDelta)
    const committedDarts = committed.reduce((sum, visit) => sum + visit.darts.length, 0)
    return committedDarts - before.pendingDarts.length + after.pendingDarts.length
  }

  return after.pendingDarts.length - before.pendingDarts.length
}

/** Apply darts with early-commit leftover detection. */
const applyDartsExact = (
  controller: AppGameController,
  darts: DartThrow[],
): { next: AppGameController; undoSteps: number } | null => {
  if (controller.isComplete || darts.length === 0) {
    return null
  }

  let current = controller
  let index = 0

  while (index < darts.length) {
    if (current.isComplete) {
      return null
    }

    const dart = darts[index]

    if (dart === undefined) {
      return null
    }

    const beforeVisits = current.session.visits.length
    const beforePending = current.pendingDarts.length
    const next = current.recordDart(dart)

    if (next === current) {
      return null
    }

    const visitCommitted = next.session.visits.length > beforeVisits
    const pendingGrew = next.pendingDarts.length === beforePending + 1

    if (!visitCommitted && !pendingGrew) {
      return null
    }

    current = next
    index += 1

    if (visitCommitted && index < darts.length) {
      // Extra spoken darts after the visit already committed — reject whole command.
      return null
    }
  }

  const undoSteps = countAppliedDarts(controller, current)

  if (undoSteps <= 0) {
    return null
  }

  return { next: current, undoSteps }
}

const resolveBob27TargetIndex = (controller: AppGameController): number | null => {
  const targets = getGameModePickerTargets(
    controller.session.mode,
    controller.engineState,
    controller.activePlayerId,
  )

  return targets.bob27TargetIndex ?? null
}

const resolveAroundTheClockTargetIndex = (controller: AppGameController): number | null => {
  const targets = getGameModePickerTargets(
    controller.session.mode,
    controller.engineState,
    controller.activePlayerId,
  )

  return targets.aroundTheClockTargetIndex ?? null
}

const buildAroundTheClockSequenceDarts = (
  outcomes: AroundTheClockOutcome[],
  committedTargetIndex: number,
  pendingDarts: DartThrow[],
  aimMode: ReturnType<typeof getAroundTheClockConfig>['aimMode'],
): DartThrow[] | null => {
  const dartsLeft = getAroundTheClockDartsLeft(pendingDarts)

  if (dartsLeft <= 0 || outcomes.length === 0 || outcomes.length > dartsLeft) {
    return null
  }

  const simulated = [...pendingDarts]
  const toApply: DartThrow[] = []

  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index]

    if (outcome === undefined) {
      return null
    }

    if (outcome === 'miss') {
      const miss = buildDartsForMissAll(1)
      toApply.push(...miss)
      simulated.push(...miss)
    } else {
      const ordinal = toAroundTheClockOrdinal(simulated.length + 1)

      if (ordinal === null) {
        return null
      }

      const chunk = buildDartsForOrdinalHit(ordinal, committedTargetIndex, simulated, aimMode)

      if (chunk.length === 0) {
        return null
      }

      toApply.push(...chunk)
      simulated.push(...chunk)
    }

    const resolved = resolveAroundTheClockVisit(committedTargetIndex, simulated, aimMode)

    if (resolved.checkout && index < outcomes.length - 1) {
      // Extra spoken darts after the finishing hit.
      return null
    }

    if (resolved.checkout) {
      return toApply
    }
  }

  // Non-checkout calls must fill every remaining dart in the visit.
  if (outcomes.length !== dartsLeft) {
    return null
  }

  return toApply
}

const buildGameplayDarts = (
  controller: AppGameController,
  intent: VoiceGameplayIntent,
): { darts: DartThrow[]; playback: VoicePlayback } | null => {
  if (intent.kind === VoiceIntentKind.Bob27HitCount) {
    const targetIndex = resolveBob27TargetIndex(controller)

    if (targetIndex === null || controller.session.mode !== GameModeId.Bob27) {
      return null
    }

    return {
      darts: buildBob27DartsForHitCount(intent.hitCount, targetIndex),
      playback: [intent.hitCount === 0 ? 'miss' : 'hit'],
    }
  }

  if (intent.kind === VoiceIntentKind.VisitScore) {
    return null
  }

  if (controller.session.mode !== GameModeId.AroundTheClock) {
    return null
  }

  const { mode, config } = controller.session

  if (!isAroundTheClockConfig(mode, config)) {
    return null
  }

  const targetIndex = resolveAroundTheClockTargetIndex(controller)

  if (targetIndex === undefined || targetIndex === null) {
    return null
  }

  const dartsLeft = getAroundTheClockDartsLeft(controller.pendingDarts)

  if (dartsLeft <= 0) {
    return null
  }

  const { aimMode } = getAroundTheClockConfig(config)

  if (intent.command.type === 'missed-all') {
    return {
      darts: buildDartsForMissAll(dartsLeft),
      playback: ['miss'],
    }
  }

  const darts = buildAroundTheClockSequenceDarts(
    intent.command.outcomes,
    targetIndex,
    controller.pendingDarts,
    aimMode,
  )

  if (darts === null) {
    return null
  }

  return { darts, playback: [...intent.command.outcomes] }
}

const applyGameplay = (
  controller: AppGameController,
  intent: VoiceGameplayIntent,
): {
  next: AppGameController
  undoSteps: number
  before: VoiceFingerprint
  after: VoiceFingerprint
  playback: VoicePlayback
} | null => {
  if (intent.kind === VoiceIntentKind.VisitScore) {
    if (controller.pendingDarts.length > 0) {
      return null
    }

    const before = fingerprintOf(controller)
    const next = controller.recordVisitScore(intent.score)

    if (next === controller || next.session.visits.length <= controller.session.visits.length) {
      return null
    }

    return {
      next,
      undoSteps: 1,
      before,
      after: fingerprintOf(next),
      playback: [intent.score === 0 ? 'miss' : 'hit'],
    }
  }

  const built = buildGameplayDarts(controller, intent)

  if (built === null) {
    return null
  }

  const before = fingerprintOf(controller)
  const applied = applyDartsExact(controller, built.darts)

  if (applied === null) {
    return null
  }

  if (
    intent.kind === VoiceIntentKind.AroundTheClock &&
    !isAllowedAroundTheClockOutcome(controller, applied.next)
  ) {
    return null
  }

  // Bob's 27 always undoes as one visit.
  const undoSteps = intent.kind === VoiceIntentKind.Bob27HitCount ? 1 : applied.undoSteps

  return {
    next: applied.next,
    undoSteps,
    before,
    after: fingerprintOf(applied.next),
    playback: built.playback,
  }
}

/** Around the Clock voice calls must complete the current visit (no leftover pending). */
const isAllowedAroundTheClockOutcome = (
  before: AppGameController,
  after: AppGameController,
): boolean => {
  if (after.pendingDarts.length !== 0) {
    return false
  }

  return after.session.visits.length > before.session.visits.length || after.isComplete
}

const applyUndoSteps = (controller: AppGameController, steps: number): AppGameController | null => {
  let current = controller

  for (let i = 0; i < steps; i += 1) {
    const next = current.undoDart()

    if (next === current) {
      return null
    }

    current = next
  }

  return current
}

/**
 * Dry-run a voice intent against the current controller.
 * Returns null when the command must be silently ignored.
 */
export const executeVoiceCommand = (
  controller: AppGameController,
  intent: VoiceIntent,
  history: VoiceUndoHistory,
): VoiceExecuteResult | null => {
  const sessionId = controller.session.id
  history.clearIfSessionChanged(sessionId)

  if (intent.kind === VoiceIntentKind.Undo) {
    if (!history.isEligible(sessionId, fingerprintOf(controller))) {
      return null
    }

    const top = history.peek()

    if (top === undefined) {
      return null
    }

    const next = applyUndoSteps(controller, top.undoSteps)

    if (next === null) {
      return null
    }

    return {
      next,
      scoreCallerBase: next,
      didUndo: true,
      playback: null,
      commitHistory: (h) => {
        h.pop()
      },
    }
  }

  if (intent.kind === VoiceIntentKind.Fix) {
    if (!history.isEligible(sessionId, fingerprintOf(controller))) {
      return null
    }

    const top = history.peek()

    if (top === undefined) {
      return null
    }

    const undone = applyUndoSteps(controller, top.undoSteps)

    if (undone === null) {
      return null
    }

    const applied = applyGameplay(undone, intent.inner)

    if (applied === null) {
      return null
    }

    return {
      next: applied.next,
      scoreCallerBase: undone,
      didUndo: true,
      playback: applied.playback,
      commitHistory: (h) => {
        h.replaceTop({
          sessionId,
          undoSteps: applied.undoSteps,
          before: applied.before,
          after: applied.after,
        })
      },
    }
  }

  const applied = applyGameplay(controller, intent)

  if (applied === null) {
    return null
  }

  return {
    next: applied.next,
    scoreCallerBase: controller,
    didUndo: false,
    playback: applied.playback,
    commitHistory: (h) => {
      h.push({
        sessionId,
        undoSteps: applied.undoSteps,
        before: applied.before,
        after: applied.after,
      })
    },
  }
}
