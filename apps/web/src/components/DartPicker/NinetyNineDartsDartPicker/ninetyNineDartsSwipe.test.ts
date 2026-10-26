import { describe, expect, it } from 'vitest'
import { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'
import {
  getNinetyNineDartsSwipeCommit,
  NINETY_NINE_DARTS_SWIPE_TAP_SLOP_PX,
  resolveNinetyNineDartsSwipe,
} from './ninetyNineDartsSwipe'
import type { NinetyNineDartsFieldCenter, NinetyNineDartsSwipeSample } from './ninetyNineDartsSwipe'

/** Column centers and outcome row centers matching a typical number-target layout. */
const COLUMN_X = [50, 150, 250] as const
const OUTCOME_Y: Record<NinetyNineDartsOutcome, number> = {
  [NinetyNineDartsOutcome.Double]: 40,
  [NinetyNineDartsOutcome.Triple]: 150,
  [NinetyNineDartsOutcome.Single]: 260,
  [NinetyNineDartsOutcome.Miss]: 370,
}

/** Tight enough that edge clips miss the center; clear mid-field hovers hit it. */
const FIELD_RADIUS = 40

const ALL_OUTCOMES = [
  NinetyNineDartsOutcome.Double,
  NinetyNineDartsOutcome.Triple,
  NinetyNineDartsOutcome.Single,
  NinetyNineDartsOutcome.Miss,
] as const

const centers: NinetyNineDartsFieldCenter[] = [0, 1, 2].flatMap((column) =>
  ALL_OUTCOMES.map((outcome) => ({
    column,
    outcome,
    x: COLUMN_X[column] ?? 0,
    y: OUTCOME_Y[outcome],
    radius: FIELD_RADIUS,
  })),
)

const at = (
  column: number,
  outcome: NinetyNineDartsOutcome,
  offsetX = 0,
  offsetY = 0,
): NinetyNineDartsSwipeSample => ({
  column,
  outcome,
  x: (COLUMN_X[column] ?? 0) + offsetX,
  y: OUTCOME_Y[outcome] + offsetY,
})

/** Point inside a field's hit box but outside its center radius (transit clip). */
const edgeOf = (
  column: number,
  outcome: NinetyNineDartsOutcome,
  offsetY: number,
): NinetyNineDartsSwipeSample => at(column, outcome, 0, offsetY)

/** Linear interpolation of samples along a polyline of key points. */
const stroke = (...keys: NinetyNineDartsSwipeSample[]): NinetyNineDartsSwipeSample[] => {
  if (keys.length === 0) {
    return []
  }

  const samples: NinetyNineDartsSwipeSample[] = []

  for (let segment = 0; segment < keys.length - 1; segment += 1) {
    const from = keys[segment]
    const to = keys[segment + 1]
    if (from === undefined || to === undefined) {
      continue
    }

    const steps = 8
    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps
      const x = from.x + (to.x - from.x) * progress
      const y = from.y + (to.y - from.y) * progress
      const source = progress < 0.5 ? from : to
      samples.push({ column: source.column, outcome: source.outcome, x, y })
    }
  }

  const last = keys[keys.length - 1]
  if (last !== undefined) {
    samples.push(last)
  }

  return samples
}

const resolve = (samples: NinetyNineDartsSwipeSample[], startColumn = 0) =>
  resolveNinetyNineDartsSwipe(samples, startColumn, centers)

const commit = (samples: NinetyNineDartsSwipeSample[], startColumn = 0) =>
  getNinetyNineDartsSwipeCommit(samples, startColumn, 3, centers)

describe('resolveNinetyNineDartsSwipe', () => {
  it('records a tap on the pressed field only', () => {
    expect(resolve([at(0, NinetyNineDartsOutcome.Double)])).toEqual([NinetyNineDartsOutcome.Double])
  })

  it('keeps the pressed field for a sub-slop wobble onto a neighbour', () => {
    const press = at(0, NinetyNineDartsOutcome.Double)
    const wobble: NinetyNineDartsSwipeSample = {
      column: 0,
      outcome: NinetyNineDartsOutcome.Triple,
      x: press.x,
      y: press.y + NINETY_NINE_DARTS_SWIPE_TAP_SLOP_PX - 1,
    }

    expect(resolve([press, wobble])).toEqual([NinetyNineDartsOutcome.Double])
  })

  it('updates the tip when the finger moves clearly onto another field center', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Double),
      at(0, NinetyNineDartsOutcome.Triple),
      at(0, NinetyNineDartsOutcome.Single),
    )

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Single])
  })

  it('records a straight row across three columns', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Single),
      at(1, NinetyNineDartsOutcome.Single),
      at(2, NinetyNineDartsOutcome.Single),
    )

    expect(resolve(samples)).toEqual([
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Single,
    ])
  })

  it('ignores an edge clip of treble when swiping from double toward the next column', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Double),
      edgeOf(0, NinetyNineDartsOutcome.Triple, -(FIELD_RADIUS + 5)),
      at(1, NinetyNineDartsOutcome.Triple),
    )

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Double, NinetyNineDartsOutcome.Triple])
  })

  it('updates the first dart when the finger clearly visits the treble center before leaving', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Double),
      at(0, NinetyNineDartsOutcome.Triple),
      at(1, NinetyNineDartsOutcome.Single),
    )

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Triple, NinetyNineDartsOutcome.Single])
  })

  it('records Double, Single, Treble with transit edge clips ignored', () => {
    // Stay high while leaving col0 so Triple's center is never approached, then bend at Single.
    const samples: NinetyNineDartsSwipeSample[] = [
      at(0, NinetyNineDartsOutcome.Double),
      { column: 0, outcome: NinetyNineDartsOutcome.Double, x: 85, y: 45 },
      {
        column: 0,
        outcome: NinetyNineDartsOutcome.Triple,
        x: 95,
        y: OUTCOME_Y[NinetyNineDartsOutcome.Triple] - (FIELD_RADIUS + 12),
      },
      at(1, NinetyNineDartsOutcome.Single),
      {
        column: 2,
        outcome: NinetyNineDartsOutcome.Double,
        x: COLUMN_X[2],
        y: OUTCOME_Y[NinetyNineDartsOutcome.Double] + (FIELD_RADIUS + 12),
      },
      at(2, NinetyNineDartsOutcome.Triple),
    ]

    expect(resolve(samples)).toEqual([
      NinetyNineDartsOutcome.Double,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Triple,
    ])
  })

  it('keeps the corner when a small edge spike into a neighbour returns', () => {
    const bend = at(1, NinetyNineDartsOutcome.Single)
    const spike = edgeOf(1, NinetyNineDartsOutcome.Triple, FIELD_RADIUS + 5)
    const samples = [
      ...stroke(at(0, NinetyNineDartsOutcome.Double), bend),
      spike,
      bend,
      ...stroke(bend, at(2, NinetyNineDartsOutcome.Triple)).slice(1),
    ]

    expect(resolve(samples)).toEqual([
      NinetyNineDartsOutcome.Double,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Triple,
    ])
  })

  it('records only the first dart when the middle column only clips field edges', () => {
    // Path through col1 stays between Triple and Single centers (both radius 40 → gap around y=205).
    const samples: NinetyNineDartsSwipeSample[] = [
      at(0, NinetyNineDartsOutcome.Double),
      { column: 0, outcome: NinetyNineDartsOutcome.Double, x: 90, y: 50 },
      { column: 1, outcome: NinetyNineDartsOutcome.Triple, x: 150, y: 205 },
      { column: 1, outcome: NinetyNineDartsOutcome.Single, x: 160, y: 205 },
      { column: 2, outcome: NinetyNineDartsOutcome.Miss, x: 250, y: 370 },
    ]

    const resolved = resolve(samples)

    expect(resolved[0]).toBe(NinetyNineDartsOutcome.Double)
    // Middle column only clips edges — stop before guessing.
    expect(resolved).toHaveLength(1)
  })

  it('fills remaining darts when the stroke starts on dart 2', () => {
    const samples = stroke(
      at(1, NinetyNineDartsOutcome.Double),
      at(2, NinetyNineDartsOutcome.Single),
    )

    expect(resolve(samples, 1)).toEqual([
      NinetyNineDartsOutcome.Double,
      NinetyNineDartsOutcome.Single,
    ])
  })

  it('ignores samples in already-thrown columns', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Miss),
      at(1, NinetyNineDartsOutcome.Single),
      at(2, NinetyNineDartsOutcome.Triple),
    )

    expect(resolve(samples, 1)).toEqual([
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Triple,
    ])
  })

  it('discards later darts when the finger moves back to an earlier column', () => {
    const samples = [
      ...stroke(
        at(0, NinetyNineDartsOutcome.Double),
        at(1, NinetyNineDartsOutcome.Single),
        at(2, NinetyNineDartsOutcome.Triple),
      ),
      ...stroke(at(2, NinetyNineDartsOutcome.Triple), at(0, NinetyNineDartsOutcome.Miss)).slice(1),
    ]

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Miss])
  })

  it('follows later center visits while still in the tip column', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Triple),
      at(0, NinetyNineDartsOutcome.Double),
      at(0, NinetyNineDartsOutcome.Single),
      at(0, NinetyNineDartsOutcome.Double),
    )

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Double])
  })

  it('after going back, later darts stay discarded until the finger advances again', () => {
    const samples = [
      ...stroke(at(0, NinetyNineDartsOutcome.Double), at(1, NinetyNineDartsOutcome.Single)),
      ...stroke(at(1, NinetyNineDartsOutcome.Single), at(0, NinetyNineDartsOutcome.Triple)).slice(
        1,
      ),
      ...stroke(at(0, NinetyNineDartsOutcome.Triple), at(0, NinetyNineDartsOutcome.Double)).slice(
        1,
      ),
    ]

    expect(resolve(samples)).toEqual([NinetyNineDartsOutcome.Double])
  })
})

describe('getNinetyNineDartsSwipeCommit', () => {
  it('commits a tap as a single dart', () => {
    expect(commit([at(0, NinetyNineDartsOutcome.Double)])).toEqual([NinetyNineDartsOutcome.Double])
  })

  it('commits a full three-dart swipe', () => {
    const samples = stroke(
      at(0, NinetyNineDartsOutcome.Single),
      at(1, NinetyNineDartsOutcome.Single),
      at(2, NinetyNineDartsOutcome.Single),
    )

    expect(commit(samples)).toEqual([
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Single,
    ])
  })

  it('does not commit a swipe that only covers one or two darts', () => {
    const oneColumn = stroke(
      at(0, NinetyNineDartsOutcome.Double),
      at(0, NinetyNineDartsOutcome.Single),
    )
    const twoColumns = stroke(
      at(0, NinetyNineDartsOutcome.Double),
      at(1, NinetyNineDartsOutcome.Single),
    )

    expect(commit(oneColumn)).toEqual([])
    expect(commit(twoColumns)).toEqual([])
  })

  it('does not commit a mid-visit swipe of remaining darts', () => {
    const samples = stroke(
      at(1, NinetyNineDartsOutcome.Double),
      at(2, NinetyNineDartsOutcome.Single),
    )

    expect(commit(samples, 1)).toEqual([])
  })
})
