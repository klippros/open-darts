import type { DartThrow } from '../../types/dart'
import { hitsBull, hitsDoubleOnNumber } from '../segmentMatching'

export const BOB27_TARGET_COUNT = 21

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

export interface Bob27VisitOutcome {
  scoreAfter: number
  targetIndexAfter: number
  hit: boolean
  checkout: boolean
}

export const resolveBob27Visit = (
  scoreBefore: number,
  targetIndex: number,
  darts: DartThrow[],
): Bob27VisitOutcome => {
  const target = getBob27Target(targetIndex)
  const hit = darts.some((dart) => isBob27TargetHit(dart, targetIndex))
  const scoreAfter = hit ? scoreBefore + target.value : scoreBefore - target.value
  const targetIndexAfter = hit ? targetIndex + 1 : targetIndex
  const checkout = hit && targetIndex >= 20

  return {
    scoreAfter,
    targetIndexAfter,
    hit,
    checkout,
  }
}
