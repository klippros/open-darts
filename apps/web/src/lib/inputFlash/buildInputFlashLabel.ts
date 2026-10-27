import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { getAroundTheClockTargetAimLabel } from '@open-darts/game/aroundTheClock/aroundTheClockRules'
import { formatDart } from '@open-darts/game/formatDart'
import {
  isAroundTheClockConfig,
  isNinetyNineDartsConfig,
} from '@open-darts/game/game/gameConfigGuards'
import {
  getHunterAdvanceForDart,
  getHunterAimFieldNumberAfterDarts,
} from '@open-darts/game/hunter/hunterRules'
import { getNinetyNineDartsDartPoints } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsRules'
import { isOneTwentyOneRoundFailedVisit } from '@open-darts/game/oneTwentyOne/oneTwentyOneVisitMetadata'
import { DartMultiplier } from '@open-darts/game/types/dart'
import type { DartThrow } from '@open-darts/game/types/dart'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import type { Visit } from '@open-darts/game/types/visit'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { formatSignedDelta } from './formatSignedDelta'

export type InputFlashKind = 'input' | 'undo'

export interface InputFlashLabel {
  text: string
  kind: InputFlashKind
}

export interface InputFlashTransitionSnapshot {
  mode: GameModeId
  config: GameConfig
  pendingDarts: DartThrow[]
  visits: Visit[]
  /** Committed Hunter field number for the active player at the start of the visit. */
  hunterFieldNumber?: number
  /** Around the Clock / Claim target index at the start of the visit (before pending). */
  aroundTheClockTargetIndex?: number
}

const GAME_SHOT = 'Game Shot'
const BUST = 'Bust'
const LIFE_LOST = 'Life lost'
const MISS = 'Miss'
const FAILED = 'Failed'

const isMissDart = (dart: DartThrow): boolean => dart.multiplier === DartMultiplier.Miss

const formatUndo = (label: string): string => `Undo ${label}`

const readHitCount = (visit: Visit): number | null => {
  const hitCount = visit.metadata?.hitCount

  if (typeof hitCount === 'number' && Number.isFinite(hitCount) && hitCount >= 0) {
    return hitCount
  }

  return null
}

const applyVisitOutcomeOverride = (mode: GameModeId, visit: Visit, inputLabel: string): string => {
  if (visit.checkout) {
    return GAME_SHOT
  }

  if (mode === GameModeId.OneTwentyOne && isOneTwentyOneRoundFailedVisit(visit)) {
    return LIFE_LOST
  }

  if (visit.bust) {
    return BUST
  }

  return inputLabel
}

const labelForVisitScoreInput = (mode: GameModeId, visit: Visit): string => {
  if (mode === GameModeId.TenUpOneDown) {
    return visit.checkout ? GAME_SHOT : FAILED
  }

  return String(visit.visitScore)
}

const labelForBob27Visit = (visit: Visit): string => formatSignedDelta(visit.visitScore)

const labelForClaimTheBoardVisit = (visit: Visit): string => {
  const hitCount = readHitCount(visit)

  if (hitCount === 0 || visit.visitScore === 0) {
    return MISS
  }

  return formatSignedDelta(visit.visitScore)
}

const labelForAroundTheClockDarts = (
  darts: DartThrow[],
  config: GameConfig,
  targetIndex: number | undefined,
): string => {
  if (darts.length === 0) {
    return MISS
  }

  if (darts.every(isMissDart)) {
    return MISS
  }

  const aimMode = isAroundTheClockConfig(GameModeId.AroundTheClock, config)
    ? getAroundTheClockConfig(config).aimMode
    : getAroundTheClockConfig({ finishOnBull: true }).aimMode

  if (targetIndex === undefined) {
    const hit = darts.findLast((dart) => !isMissDart(dart))
    return hit === undefined ? MISS : formatDart(hit)
  }

  return getAroundTheClockTargetAimLabel(targetIndex, aimMode)
}

const sumNinetyNinePoints = (darts: DartThrow[], config: GameConfig): number => {
  if (!isNinetyNineDartsConfig(GameModeId.NinetyNineDarts, config)) {
    return 0
  }

  return darts.reduce((total, dart) => total + getNinetyNineDartsDartPoints(dart, config.target), 0)
}

const sumHunterAdvances = (
  darts: DartThrow[],
  committedFieldNumber: number | undefined,
  pendingBefore: DartThrow[],
): number => {
  if (committedFieldNumber === undefined || darts.length === 0) {
    return 0
  }

  let total = 0
  const applied: DartThrow[] = [...pendingBefore]

  for (const dart of darts) {
    const fieldNumber = getHunterAimFieldNumberAfterDarts(committedFieldNumber, applied)
    total += getHunterAdvanceForDart(dart, fieldNumber)
    applied.push(dart)
  }

  return total
}

/** Points for a single Hunter dart given committed field and darts before it in the visit. */
const hunterAdvanceForDartAt = (
  dart: DartThrow,
  committedFieldNumber: number,
  dartsBefore: DartThrow[],
): number => {
  const fieldNumber = getHunterAimFieldNumberAfterDarts(committedFieldNumber, dartsBefore)
  return getHunterAdvanceForDart(dart, fieldNumber)
}

const labelForAddedDarts = (
  mode: GameModeId,
  config: GameConfig,
  darts: DartThrow[],
  before: InputFlashTransitionSnapshot,
): string => {
  if (mode === GameModeId.AroundTheClock) {
    return labelForAroundTheClockDarts(darts, config, before.aroundTheClockTargetIndex)
  }

  if (mode === GameModeId.NinetyNineDarts) {
    return formatSignedDelta(sumNinetyNinePoints(darts, config))
  }

  if (mode === GameModeId.Hunter) {
    return formatSignedDelta(
      sumHunterAdvances(darts, before.hunterFieldNumber, before.pendingDarts),
    )
  }

  if (darts.length === 1 && darts[0] !== undefined) {
    return formatDart(darts[0])
  }

  return darts.map((dart) => formatDart(dart)).join(' · ')
}

const labelForCommittedVisitInput = (
  mode: GameModeId,
  config: GameConfig,
  visit: Visit,
  before: InputFlashTransitionSnapshot,
): string => {
  if (visit.inputMode === VisitInputMode.VisitScore) {
    return applyVisitOutcomeOverride(mode, visit, labelForVisitScoreInput(mode, visit))
  }

  if (mode === GameModeId.Bob27) {
    return applyVisitOutcomeOverride(mode, visit, labelForBob27Visit(visit))
  }

  if (mode === GameModeId.ClaimTheBoard) {
    return applyVisitOutcomeOverride(mode, visit, labelForClaimTheBoardVisit(visit))
  }

  const addedDarts = visit.darts.slice(before.pendingDarts.length)
  const gestureDarts = addedDarts.length > 0 ? addedDarts : visit.darts
  const inputLabel = labelForAddedDarts(mode, config, gestureDarts, before)

  return applyVisitOutcomeOverride(mode, visit, inputLabel)
}

const labelForRemovedDart = (
  mode: GameModeId,
  config: GameConfig,
  dart: DartThrow,
  dartsBefore: DartThrow[],
  before: InputFlashTransitionSnapshot,
): string => {
  if (mode === GameModeId.NinetyNineDarts && isNinetyNineDartsConfig(mode, config)) {
    return formatSignedDelta(getNinetyNineDartsDartPoints(dart, config.target))
  }

  if (mode === GameModeId.Hunter && before.hunterFieldNumber !== undefined) {
    return formatSignedDelta(hunterAdvanceForDartAt(dart, before.hunterFieldNumber, dartsBefore))
  }

  if (mode === GameModeId.AroundTheClock && isAroundTheClockConfig(mode, config)) {
    if (isMissDart(dart)) {
      return MISS
    }

    return formatDart(dart)
  }

  return formatDart(dart)
}

const labelForRemovedVisit = (mode: GameModeId, visit: Visit): string => {
  if (visit.checkout) {
    return GAME_SHOT
  }

  if (mode === GameModeId.OneTwentyOne && isOneTwentyOneRoundFailedVisit(visit)) {
    return LIFE_LOST
  }

  if (visit.bust) {
    return BUST
  }

  if (visit.inputMode === VisitInputMode.VisitScore) {
    return labelForVisitScoreInput(mode, visit)
  }

  if (mode === GameModeId.Bob27) {
    return labelForBob27Visit(visit)
  }

  if (mode === GameModeId.ClaimTheBoard) {
    return labelForClaimTheBoardVisit(visit)
  }

  return String(visit.visitScore)
}

const isVisitUndoMode = (mode: GameModeId): boolean =>
  mode === GameModeId.Bob27 || mode === GameModeId.ClaimTheBoard

/**
 * Build the flash label for a controller transition after an input or undo.
 * Returns null when nothing meaningful changed.
 */
export const buildInputFlashFromTransition = (
  before: InputFlashTransitionSnapshot,
  after: InputFlashTransitionSnapshot,
  options: { didUndo?: boolean } = {},
): InputFlashLabel | null => {
  const didUndo =
    options.didUndo === true ||
    after.visits.length < before.visits.length ||
    (after.visits.length === before.visits.length &&
      after.pendingDarts.length < before.pendingDarts.length)

  if (didUndo) {
    if (before.pendingDarts.length > 0) {
      if (isVisitUndoMode(before.mode)) {
        // Visit-undo strategy clears all pending; rare mid-batch path.
        const cleared = before.pendingDarts
        const label = labelForAddedDarts(before.mode, before.config, cleared, {
          ...before,
          pendingDarts: [],
        })
        return { text: formatUndo(label), kind: 'undo' }
      }

      const removed = before.pendingDarts.at(-1)
      if (removed === undefined) {
        return null
      }

      const dartsBefore = before.pendingDarts.slice(0, -1)
      return {
        text: formatUndo(
          labelForRemovedDart(before.mode, before.config, removed, dartsBefore, before),
        ),
        kind: 'undo',
      }
    }

    const removedVisit = before.visits.at(-1)
    if (removedVisit === undefined) {
      return null
    }

    if (isVisitUndoMode(before.mode) || removedVisit.inputMode === VisitInputMode.VisitScore) {
      return { text: formatUndo(labelForRemovedVisit(before.mode, removedVisit)), kind: 'undo' }
    }

    const removedDart = removedVisit.darts.at(-1)
    if (removedDart === undefined) {
      return { text: formatUndo(labelForRemovedVisit(before.mode, removedVisit)), kind: 'undo' }
    }

    const dartsBefore = removedVisit.darts.slice(0, -1)
    return {
      text: formatUndo(
        labelForRemovedDart(before.mode, before.config, removedDart, dartsBefore, before),
      ),
      kind: 'undo',
    }
  }

  if (after.visits.length > before.visits.length) {
    const visit = after.visits.at(-1)
    if (visit === undefined) {
      return null
    }

    return {
      text: labelForCommittedVisitInput(before.mode, before.config, visit, before),
      kind: 'input',
    }
  }

  if (after.pendingDarts.length > before.pendingDarts.length) {
    const added = after.pendingDarts.slice(before.pendingDarts.length)
    if (added.length === 0) {
      return null
    }

    return {
      text: labelForAddedDarts(before.mode, before.config, added, before),
      kind: 'input',
    }
  }

  return null
}

/** Narrow helpers kept for unit tests of outcome label strings. */
export const inputFlashLabels = {
  gameShot: GAME_SHOT,
  bust: BUST,
  lifeLost: LIFE_LOST,
  miss: MISS,
  failed: FAILED,
} as const
