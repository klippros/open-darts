import type { DartThrow } from '../types/dart'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import {
  AROUND_THE_CLOCK_TARGET_COUNT,
  getAroundTheClockTargetAimLabel,
  isAroundTheClockBullTarget,
  isAroundTheClockTargetHit,
} from '../aroundTheClock/aroundTheClockRules'

export const CLAIM_THE_BOARD_TARGET_COUNT = AROUND_THE_CLOCK_TARGET_COUNT
export const CLAIM_THE_BOARD_MAX_DARTS_PER_VISIT = 3
export const CLAIM_THE_BOARD_LAST_TARGET_VALUE = 25

export interface ClaimTheBoardTarget {
  label: string
  value: number
}

export const getClaimTheBoardTarget = (
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): ClaimTheBoardTarget => {
  const label = getAroundTheClockTargetAimLabel(targetIndex, aimMode)

  if (isAroundTheClockBullTarget(targetIndex)) {
    return {
      label,
      value: CLAIM_THE_BOARD_LAST_TARGET_VALUE,
    }
  }

  const segment = targetIndex + 1

  switch (aimMode) {
    case AroundTheClockAimMode.Doubles:
      return { label, value: segment * 2 }
    case AroundTheClockAimMode.Trebles:
      return { label, value: segment * 3 }
    case AroundTheClockAimMode.Singles:
    case AroundTheClockAimMode.Any:
      return { label, value: segment }
    default: {
      throw new Error(`Unhandled aim mode: ${String(aimMode)}`)
    }
  }
}

export const countClaimTheBoardTargetHits = (
  darts: DartThrow[],
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): number => darts.filter((dart) => isAroundTheClockTargetHit(dart, targetIndex, aimMode)).length

export interface ClaimTheBoardVisitOutcome {
  scoreAfter: number
  sharedTargetIndexAfter: number
  hit: boolean
  hitCount: number
  visitScore: number
  checkout: boolean
}

export const resolveClaimTheBoardVisit = (
  scoreBefore: number,
  sharedTargetIndex: number,
  darts: DartThrow[],
  aimMode: AroundTheClockAimMode,
): ClaimTheBoardVisitOutcome => {
  const target = getClaimTheBoardTarget(sharedTargetIndex, aimMode)
  const hitCount = countClaimTheBoardTargetHits(darts, sharedTargetIndex, aimMode)
  const hit = hitCount > 0
  const visitScore = hitCount * target.value
  const scoreAfter = scoreBefore + visitScore
  const sharedTargetIndexAfter = hit ? sharedTargetIndex + 1 : sharedTargetIndex
  const checkout = hit && isAroundTheClockBullTarget(sharedTargetIndex)

  return {
    scoreAfter,
    sharedTargetIndexAfter,
    hit,
    hitCount,
    visitScore,
    checkout,
  }
}

/**
 * Highest score wins after someone hits the final target.
 * On a tied score, the player who hit that finishing target wins.
 */
export const resolveClaimTheBoardWinnerId = (
  players: Record<string, { score: number }>,
  finishingPlayerId: string,
): string => {
  const finisher = players[finishingPlayerId]

  if (finisher === undefined) {
    throw new Error(`Unknown player: ${finishingPlayerId}`)
  }

  let bestPlayerId = finishingPlayerId
  let bestScore = finisher.score

  for (const [playerId, playerState] of Object.entries(players)) {
    if (playerState.score > bestScore) {
      bestScore = playerState.score
      bestPlayerId = playerId
    }
  }

  return bestPlayerId
}
