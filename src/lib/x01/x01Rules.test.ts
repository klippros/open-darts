import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveX01Visit, previewX01Remaining } from './x01Rules'
import { bullDart, defaultX01Config, missDart, numberDart } from '../testHelpers'

describe('resolveX01Visit', () => {
  const config = defaultX01Config()

  it('subtracts a normal three-dart visit', () => {
    const outcome = resolveX01Visit(
      501,
      [
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
      ],
      config,
      true,
    )

    expect(outcome).toEqual({
      scoreAfter: 321,
      bust: false,
      checkout: false,
      opened: true,
    })
  })

  it('ignores misses when scoring', () => {
    const outcome = resolveX01Visit(
      100,
      [missDart(), numberDart(20, DartMultiplier.Single)],
      config,
      true,
    )

    expect(outcome.scoreAfter).toBe(80)
    expect(outcome.bust).toBe(false)
  })

  it('busts when score goes below zero', () => {
    const outcome = resolveX01Visit(10, [numberDart(20, DartMultiplier.Single)], config, true)

    expect(outcome).toEqual({
      scoreAfter: 10,
      bust: true,
      checkout: false,
      opened: true,
    })
  })

  it('busts when double-out leaves one remaining', () => {
    const outcome = resolveX01Visit(21, [numberDart(20, DartMultiplier.Single)], config, true)

    expect(outcome.bust).toBe(true)
    expect(outcome.scoreAfter).toBe(21)
  })

  it('busts when reaching zero without a double', () => {
    const outcome = resolveX01Visit(20, [numberDart(20, DartMultiplier.Single)], config, true)

    expect(outcome).toEqual({
      scoreAfter: 20,
      bust: true,
      checkout: false,
      opened: true,
    })
  })

  it('checkouts on a valid double finish', () => {
    const outcome = resolveX01Visit(40, [numberDart(20, DartMultiplier.Double)], config, true)

    expect(outcome).toEqual({
      scoreAfter: 0,
      bust: false,
      checkout: true,
      opened: true,
    })
  })

  it('checkouts on inner bull from fifty remaining', () => {
    const outcome = resolveX01Visit(50, [bullDart()], config, true)

    expect(outcome.checkout).toBe(true)
    expect(outcome.scoreAfter).toBe(0)
  })

  it('requires double-in before singles count toward score', () => {
    const doubleInConfig = { ...config, doubleIn: true }

    const blocked = resolveX01Visit(
      501,
      [numberDart(20, DartMultiplier.Single)],
      doubleInConfig,
      false,
    )
    expect(blocked.scoreAfter).toBe(501)

    const opened = resolveX01Visit(
      501,
      [numberDart(20, DartMultiplier.Double)],
      doubleInConfig,
      false,
    )
    expect(opened.scoreAfter).toBe(461)
    expect(opened.opened).toBe(true)
  })

  it('busts mid-visit and reverts to score before the visit', () => {
    const outcome = resolveX01Visit(
      60,
      [numberDart(20, DartMultiplier.Single), numberDart(20, DartMultiplier.Triple)],
      config,
      true,
    )

    expect(outcome.bust).toBe(true)
    expect(outcome.scoreAfter).toBe(60)
  })
})

describe('previewX01Remaining', () => {
  it('matches resolveX01Visit scoreAfter', () => {
    const darts = [numberDart(20, DartMultiplier.Triple)]
    const config = defaultX01Config()

    expect(previewX01Remaining(100, darts, config, true)).toBe(
      resolveX01Visit(100, darts, config, true).scoreAfter,
    )
  })
})
