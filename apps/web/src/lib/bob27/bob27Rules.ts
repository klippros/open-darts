import type { DartThrow } from '../../types/dart'
import { hitsBull, hitsDoubleOnNumber } from '../segmentMatching'

export const BOB27_TARGET_COUNT = 21
export const BOB27_MAX_DARTS_PER_VISIT = 3

export interface Bob27Target {
  label: string
  value: number
}

export const getBob27Target = (targetIndex: number): Bob27Target => {
  if (targetIndex >= 20) {
    return { label: 'Bull', value: 50 }
  }

  const segment = targetIndex + 1

  return {
    label: `D${segment}`,
    value: segment * 2,
  }
}

export const isBob27TargetHit = (dart: DartThrow, targetIndex: number): boolean => {
  if (targetIndex >= 20) {
    return hitsBull(dart)
  }

  return hitsDoubleOnNumber(dart, targetIndex + 1)
}

export const countBob27TargetHits = (darts: DartThrow[], targetIndex: number): number =>
  darts.filter((dart) => isBob27TargetHit(dart, targetIndex)).length

export interface Bob27VisitOutcome {
  scoreAfter: number
  targetIndexAfter: number
  hit: boolean
  hitCount: number
  visitScore: number
  checkout: boolean
}

export const resolveBob27Visit = (
  scoreBefore: number,
  targetIndex: number,
  darts: DartThrow[],
): Bob27VisitOutcome => {
  const target = getBob27Target(targetIndex)
  const hitCount = countBob27TargetHits(darts, targetIndex)
  const hit = hitCount > 0
  const visitScore = hit ? hitCount * target.value : -target.value
  const scoreAfter = scoreBefore + visitScore
  const targetIndexAfter = targetIndex + 1
  const checkout = targetIndex >= 20

  return {
    scoreAfter,
    targetIndexAfter,
    hit,
    hitCount,
    visitScore,
    checkout,
  }
}
