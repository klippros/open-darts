import type { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'

/** Max movement that still counts as a tap on the pressed field. */
export const NINETY_NINE_DARTS_SWIPE_TAP_SLOP_PX = 12

/**
 * Fraction of a field's smaller side used as the center-proximity radius.
 * Edge clips fall outside; a clear hover near the middle falls inside.
 */
export const NINETY_NINE_DARTS_SWIPE_CENTER_RADIUS_RATIO = 0.32

export interface NinetyNineDartsSwipeSample {
  column: number
  /** Hit-tested field under the pointer (may be an edge clip). */
  outcome: NinetyNineDartsOutcome
  x: number
  y: number
}

export interface NinetyNineDartsFieldCenter {
  column: number
  outcome: NinetyNineDartsOutcome
  x: number
  y: number
  radius: number
}

const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(bx - ax, by - ay)

/**
 * When the finger returns to an earlier column, drop every later column entirely
 * so those darts are discarded until the finger advances again.
 */
const applyColumnCorrections = (
  samples: NinetyNineDartsSwipeSample[],
): NinetyNineDartsSwipeSample[] => {
  const effective: NinetyNineDartsSwipeSample[] = []
  let maxColumn = -1

  for (const sample of samples) {
    if (sample.column < maxColumn) {
      const keepThrough = effective.findLastIndex((entry) => entry.column <= sample.column)

      if (keepThrough >= 0) {
        effective.length = keepThrough + 1
      } else {
        effective.length = 0
      }

      maxColumn = sample.column
    }

    effective.push(sample)
    maxColumn = Math.max(maxColumn, sample.column)
  }

  return effective
}

const samplesForColumn = (
  samples: NinetyNineDartsSwipeSample[],
  column: number,
): NinetyNineDartsSwipeSample[] => samples.filter((sample) => sample.column === column)

const centersForColumn = (
  centers: NinetyNineDartsFieldCenter[],
  column: number,
): NinetyNineDartsFieldCenter[] => centers.filter((center) => center.column === column)

/**
 * Closest field center within its proximity radius, or null when the pointer is
 * only clipping an edge / gap (transit).
 */
const closestCenterWithinRadius = (
  x: number,
  y: number,
  centers: NinetyNineDartsFieldCenter[],
): NinetyNineDartsFieldCenter | null => {
  let best: { center: NinetyNineDartsFieldCenter; distance: number } | null = null

  for (const center of centers) {
    const sampleDistance = distance(x, y, center.x, center.y)

    if (sampleDistance >= center.radius) {
      continue
    }

    if (best === null || sampleDistance < best.distance) {
      best = { center, distance: sampleDistance }
    }
  }

  return best?.center ?? null
}

/**
 * Walk samples in order. Intent updates only when the pointer is clearly near a
 * field center — later center visits replace earlier ones. Edge clips are ignored.
 */
const resolveIntentFromCenterVisits = (
  columnSamples: NinetyNineDartsSwipeSample[],
  centers: NinetyNineDartsFieldCenter[],
  initial: NinetyNineDartsOutcome | null,
): NinetyNineDartsOutcome | null => {
  let intent = initial

  for (const sample of columnSamples) {
    const near = closestCenterWithinRadius(sample.x, sample.y, centers)

    if (near !== null) {
      intent = near.outcome
    }
  }

  return intent
}

const eligibleSamples = (
  samples: NinetyNineDartsSwipeSample[],
  startColumn: number,
): NinetyNineDartsSwipeSample[] => samples.filter((sample) => sample.column >= startColumn)

const isTapStroke = (samples: NinetyNineDartsSwipeSample[], startColumn: number): boolean => {
  const eligible = eligibleSamples(samples, startColumn)
  const press = eligible[0]

  if (press === undefined) {
    return false
  }

  const maxTravel = eligible.reduce(
    (max, sample) => Math.max(max, distance(press.x, press.y, sample.x, sample.y)),
    0,
  )

  return maxTravel < NINETY_NINE_DARTS_SWIPE_TAP_SLOP_PX
}

/**
 * Resolve a lock-screen-style stroke across 99 Darts outcome columns.
 * Field intent comes from proximity to field centers over time: later clear
 * center visits win; edge clips while passing through do not.
 */
export const resolveNinetyNineDartsSwipe = (
  samples: NinetyNineDartsSwipeSample[],
  startColumn: number,
  centers: NinetyNineDartsFieldCenter[],
): NinetyNineDartsOutcome[] => {
  const eligible = eligibleSamples(samples, startColumn)

  if (eligible.length === 0) {
    return []
  }

  const press = eligible[0]
  if (press === undefined) {
    return []
  }

  const tip = eligible[eligible.length - 1]
  if (tip === undefined) {
    return []
  }

  if (isTapStroke(samples, startColumn)) {
    return [press.outcome]
  }

  const path = applyColumnCorrections(eligible)
  const tipAfterCorrection = path[path.length - 1] ?? tip
  const lastColumn = tipAfterCorrection.column
  const results: NinetyNineDartsOutcome[] = []

  for (let column = startColumn; column <= lastColumn; column += 1) {
    const columnSamples = samplesForColumn(path, column)
    const columnCenters = centersForColumn(centers, column)

    if (columnSamples.length === 0) {
      break
    }

    const isFirst = column === startColumn
    const firstSample = columnSamples[0]

    if (firstSample === undefined) {
      break
    }

    // First column may start from the press; later columns need a real center visit.
    // A later tip with no center visit yet is omitted so the previous dart stays highlighted.
    const initial: NinetyNineDartsOutcome | null = isFirst
      ? (closestCenterWithinRadius(firstSample.x, firstSample.y, columnCenters)?.outcome ??
        firstSample.outcome)
      : null

    const intent = resolveIntentFromCenterVisits(
      columnSamples,
      columnCenters,
      isFirst ? initial : null,
    )

    if (intent === null) {
      break
    }

    results.push(intent)
  }

  return results
}

/**
 * Outcomes to record on pointer up. Taps always commit one dart.
 * Swipes only commit when they fill all three visit slots.
 */
export const getNinetyNineDartsSwipeCommit = (
  samples: NinetyNineDartsSwipeSample[],
  startColumn: number,
  visitDartCount: number,
  centers: NinetyNineDartsFieldCenter[],
): NinetyNineDartsOutcome[] => {
  const resolved = resolveNinetyNineDartsSwipe(samples, startColumn, centers)

  if (resolved.length === 0) {
    return []
  }

  if (isTapStroke(samples, startColumn)) {
    return resolved
  }

  if (startColumn === 0 && resolved.length === visitDartCount) {
    return resolved
  }

  return []
}

/** Build a field-center radius from a cell's bounding box. */
export const fieldCenterRadius = (width: number, height: number): number =>
  Math.min(width, height) * NINETY_NINE_DARTS_SWIPE_CENTER_RADIUS_RATIO
