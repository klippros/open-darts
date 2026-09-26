import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { bullDart, numberDart, outerBullDart } from '../testHelpers'
import {
  getClaimTheBoardTarget,
  resolveClaimTheBoardVisit,
  resolveClaimTheBoardWinnerId,
} from './claimTheBoardRules'

describe('claimTheBoardRules', () => {
  it('uses face values by aim mode and 25 on the last target', () => {
    expect(getClaimTheBoardTarget(0, AroundTheClockAimMode.Any)).toEqual({
      label: '1',
      value: 1,
    })
    expect(getClaimTheBoardTarget(0, AroundTheClockAimMode.Doubles)).toEqual({
      label: 'D1',
      value: 2,
    })
    expect(getClaimTheBoardTarget(0, AroundTheClockAimMode.Trebles)).toEqual({
      label: 'T1',
      value: 3,
    })
    expect(getClaimTheBoardTarget(20, AroundTheClockAimMode.Any)).toEqual({
      label: '25/Bull',
      value: 25,
    })
    expect(getClaimTheBoardTarget(20, AroundTheClockAimMode.Doubles)).toEqual({
      label: 'Bull',
      value: 25,
    })
  })

  it('scores multi-hits on the same target and advances only on a hit', () => {
    const twoHits = resolveClaimTheBoardVisit(
      0,
      0,
      [
        numberDart(1, DartMultiplier.Double),
        numberDart(1, DartMultiplier.Double),
        numberDart(1, DartMultiplier.Single),
      ],
      AroundTheClockAimMode.Doubles,
    )

    expect(twoHits).toMatchObject({
      scoreAfter: 4,
      sharedTargetIndexAfter: 1,
      hit: true,
      hitCount: 2,
      visitScore: 4,
      checkout: false,
    })

    const miss = resolveClaimTheBoardVisit(
      4,
      1,
      [
        numberDart(2, DartMultiplier.Single),
        numberDart(2, DartMultiplier.Single),
        numberDart(2, DartMultiplier.Single),
      ],
      AroundTheClockAimMode.Doubles,
    )

    expect(miss).toMatchObject({
      scoreAfter: 4,
      sharedTargetIndexAfter: 1,
      hit: false,
      hitCount: 0,
      visitScore: 0,
      checkout: false,
    })
  })

  it('scores any-mode hits at face value of the number', () => {
    const visit = resolveClaimTheBoardVisit(
      0,
      4,
      [
        numberDart(5, DartMultiplier.Triple),
        numberDart(5, DartMultiplier.Double),
        numberDart(20, DartMultiplier.Miss),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(visit).toMatchObject({
      hitCount: 2,
      visitScore: 10,
      scoreAfter: 10,
      sharedTargetIndexAfter: 5,
    })
  })

  it('ends after a successful last-target visit and scores 25 per hit', () => {
    const hit = resolveClaimTheBoardVisit(
      100,
      20,
      [outerBullDart(DartMultiplier.Single), bullDart(), numberDart(20, DartMultiplier.Miss)],
      AroundTheClockAimMode.Any,
    )

    expect(hit).toMatchObject({
      checkout: true,
      hitCount: 2,
      visitScore: 50,
      scoreAfter: 150,
      sharedTargetIndexAfter: 21,
    })

    const miss = resolveClaimTheBoardVisit(
      100,
      20,
      [
        numberDart(20, DartMultiplier.Miss),
        numberDart(20, DartMultiplier.Miss),
        numberDart(20, DartMultiplier.Miss),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(miss).toMatchObject({
      checkout: false,
      hitCount: 0,
      visitScore: 0,
      sharedTargetIndexAfter: 20,
    })
  })

  it('awards ties to the finishing player', () => {
    expect(resolveClaimTheBoardWinnerId({ p1: { score: 40 }, p2: { score: 40 } }, 'p2')).toBe('p2')
    expect(resolveClaimTheBoardWinnerId({ p1: { score: 50 }, p2: { score: 40 } }, 'p2')).toBe('p1')
  })
})
