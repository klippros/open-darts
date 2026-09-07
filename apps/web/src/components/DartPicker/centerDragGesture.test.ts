import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveCenterDragRelease } from './centerDragGesture'

describe('resolveCenterDragRelease', () => {
  it('records a dragged double onto a number', () => {
    const actions = resolveCenterDragRelease(
      'double',
      { number: 16, centerZone: null },
      DartMultiplier.Single,
    )

    expect(actions).toEqual([
      { type: 'recordNumber', value: 16, multiplier: DartMultiplier.Double },
      { type: 'setArmedMultiplier', multiplier: DartMultiplier.Single },
    ])
  })

  it('restores the previous modifier when a center press is cancelled', () => {
    const actions = resolveCenterDragRelease(
      'triple',
      { number: null, centerZone: null },
      DartMultiplier.Double,
    )

    expect(actions).toEqual([{ type: 'setArmedMultiplier', multiplier: DartMultiplier.Double }])
  })

  it('toggles the same center zone off when released without dragging', () => {
    const actions = resolveCenterDragRelease(
      'double',
      { number: null, centerZone: 'double' },
      DartMultiplier.Double,
    )

    expect(actions).toEqual([{ type: 'setArmedMultiplier', multiplier: DartMultiplier.Single }])
  })

  it('arms the center zone when released on the same zone from single', () => {
    const actions = resolveCenterDragRelease(
      'triple',
      { number: null, centerZone: 'triple' },
      DartMultiplier.Single,
    )

    expect(actions).toEqual([{ type: 'setArmedMultiplier', multiplier: DartMultiplier.Triple }])
  })
})
