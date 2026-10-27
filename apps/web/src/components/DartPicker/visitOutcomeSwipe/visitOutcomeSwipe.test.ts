import { describe, expect, it } from 'vitest'
import {
  getVisitOutcomeSwipeCommit,
  resolveVisitOutcomeSwipe,
  VISIT_OUTCOME_SWIPE_TAP_SLOP_PX,
} from './visitOutcomeSwipe'
import type { VisitOutcomeFieldCenter, VisitOutcomeSwipeSample } from './visitOutcomeSwipe'

type TestOutcome = 'miss' | 'single' | 'double' | 'triple'

/** Column centers and outcome row centers matching a typical number-target layout. */
const COLUMN_X = [50, 150, 250] as const
const OUTCOME_Y: Record<TestOutcome, number> = {
  double: 40,
  triple: 150,
  single: 260,
  miss: 370,
}

/** Tight enough that edge clips miss the center; clear mid-field hovers hit it. */
const FIELD_RADIUS = 40

const ALL_OUTCOMES: TestOutcome[] = ['double', 'triple', 'single', 'miss']

const centers: VisitOutcomeFieldCenter<TestOutcome>[] = [0, 1, 2].flatMap((column) =>
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
  outcome: TestOutcome,
  offsetX = 0,
  offsetY = 0,
): VisitOutcomeSwipeSample<TestOutcome> => ({
  column,
  outcome,
  x: (COLUMN_X[column] ?? 0) + offsetX,
  y: OUTCOME_Y[outcome] + offsetY,
})

/** Point inside a field's hit box but outside its center radius (transit clip). */
const edgeOf = (
  column: number,
  outcome: TestOutcome,
  offsetY: number,
): VisitOutcomeSwipeSample<TestOutcome> => at(column, outcome, 0, offsetY)

/** Linear interpolation of samples along a polyline of key points. */
const stroke = (
  ...keys: VisitOutcomeSwipeSample<TestOutcome>[]
): VisitOutcomeSwipeSample<TestOutcome>[] => {
  if (keys.length === 0) {
    return []
  }

  const samples: VisitOutcomeSwipeSample<TestOutcome>[] = []

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

const resolve = (samples: VisitOutcomeSwipeSample<TestOutcome>[], startColumn = 0) =>
  resolveVisitOutcomeSwipe(samples, startColumn, centers)

const commit = (samples: VisitOutcomeSwipeSample<TestOutcome>[], startColumn = 0) =>
  getVisitOutcomeSwipeCommit(samples, startColumn, 3, centers)

describe('resolveVisitOutcomeSwipe', () => {
  it('records a tap on the pressed field only', () => {
    expect(resolve([at(0, 'double')])).toEqual(['double'])
  })

  it('keeps the pressed field for a sub-slop wobble onto a neighbour', () => {
    const press = at(0, 'double')
    const wobble: VisitOutcomeSwipeSample<TestOutcome> = {
      column: 0,
      outcome: 'triple',
      x: press.x,
      y: press.y + VISIT_OUTCOME_SWIPE_TAP_SLOP_PX - 1,
    }

    expect(resolve([press, wobble])).toEqual(['double'])
  })

  it('updates the tip when the finger moves clearly onto another field center', () => {
    const samples = stroke(at(0, 'double'), at(0, 'triple'), at(0, 'single'))

    expect(resolve(samples)).toEqual(['single'])
  })

  it('records a straight row across three columns', () => {
    const samples = stroke(at(0, 'single'), at(1, 'single'), at(2, 'single'))

    expect(resolve(samples)).toEqual(['single', 'single', 'single'])
  })

  it('ignores an edge clip of treble when swiping from double toward the next column', () => {
    const samples = stroke(
      at(0, 'double'),
      edgeOf(0, 'triple', -(FIELD_RADIUS + 5)),
      at(1, 'triple'),
    )

    expect(resolve(samples)).toEqual(['double', 'triple'])
  })

  it('updates the first dart when the finger clearly visits the treble center before leaving', () => {
    const samples = stroke(at(0, 'double'), at(0, 'triple'), at(1, 'single'))

    expect(resolve(samples)).toEqual(['triple', 'single'])
  })

  it('records Double, Single, Treble with transit edge clips ignored', () => {
    const samples: VisitOutcomeSwipeSample<TestOutcome>[] = [
      at(0, 'double'),
      { column: 0, outcome: 'double', x: 85, y: 45 },
      {
        column: 0,
        outcome: 'triple',
        x: 95,
        y: OUTCOME_Y.triple - (FIELD_RADIUS + 12),
      },
      at(1, 'single'),
      {
        column: 2,
        outcome: 'double',
        x: COLUMN_X[2],
        y: OUTCOME_Y.double + (FIELD_RADIUS + 12),
      },
      at(2, 'triple'),
    ]

    expect(resolve(samples)).toEqual(['double', 'single', 'triple'])
  })

  it('keeps the corner when a small edge spike into a neighbour returns', () => {
    const bend = at(1, 'single')
    const spike = edgeOf(1, 'triple', FIELD_RADIUS + 5)
    const samples = [
      ...stroke(at(0, 'double'), bend),
      spike,
      bend,
      ...stroke(bend, at(2, 'triple')).slice(1),
    ]

    expect(resolve(samples)).toEqual(['double', 'single', 'triple'])
  })

  it('records only the first dart when the middle column only clips field edges', () => {
    const samples: VisitOutcomeSwipeSample<TestOutcome>[] = [
      at(0, 'double'),
      { column: 0, outcome: 'double', x: 90, y: 50 },
      { column: 1, outcome: 'triple', x: 150, y: 205 },
      { column: 1, outcome: 'single', x: 160, y: 205 },
      { column: 2, outcome: 'miss', x: 250, y: 370 },
    ]

    const resolved = resolve(samples)

    expect(resolved[0]).toBe('double')
    expect(resolved).toHaveLength(1)
  })

  it('fills remaining darts when the stroke starts on dart 2', () => {
    const samples = stroke(at(1, 'double'), at(2, 'single'))

    expect(resolve(samples, 1)).toEqual(['double', 'single'])
  })

  it('ignores samples in already-thrown columns', () => {
    const samples = stroke(at(0, 'miss'), at(1, 'single'), at(2, 'triple'))

    expect(resolve(samples, 1)).toEqual(['single', 'triple'])
  })

  it('discards later darts when the finger moves back to an earlier column', () => {
    const samples = [
      ...stroke(at(0, 'double'), at(1, 'single'), at(2, 'triple')),
      ...stroke(at(2, 'triple'), at(0, 'miss')).slice(1),
    ]

    expect(resolve(samples)).toEqual(['miss'])
  })

  it('follows later center visits while still in the tip column', () => {
    const samples = stroke(at(0, 'triple'), at(0, 'double'), at(0, 'single'), at(0, 'double'))

    expect(resolve(samples)).toEqual(['double'])
  })

  it('after going back, later darts stay discarded until the finger advances again', () => {
    const samples = [
      ...stroke(at(0, 'double'), at(1, 'single')),
      ...stroke(at(1, 'single'), at(0, 'triple')).slice(1),
      ...stroke(at(0, 'triple'), at(0, 'double')).slice(1),
    ]

    expect(resolve(samples)).toEqual(['double'])
  })
})

describe('getVisitOutcomeSwipeCommit', () => {
  it('commits a tap as a single dart', () => {
    expect(commit([at(0, 'double')])).toEqual(['double'])
  })

  it('commits a full three-dart swipe', () => {
    const samples = stroke(at(0, 'single'), at(1, 'single'), at(2, 'single'))

    expect(commit(samples)).toEqual(['single', 'single', 'single'])
  })

  it('does not commit a swipe that only covers one or two darts', () => {
    const oneColumn = stroke(at(0, 'double'), at(0, 'single'))
    const twoColumns = stroke(at(0, 'double'), at(1, 'single'))

    expect(commit(oneColumn)).toEqual([])
    expect(commit(twoColumns)).toEqual([])
  })

  it('does not commit a mid-visit swipe of remaining darts', () => {
    const samples = stroke(at(1, 'double'), at(2, 'single'))

    expect(commit(samples, 1)).toEqual([])
  })
})
