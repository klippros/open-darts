import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { Visit } from '../../types/visit'
import { aggregatePerTargetStats } from '../analytics/aroundTheClockStats'
import { bullDart, missDart, numberDart, outerBullDart } from '../testHelpers'
import {
  extractAroundTheClockTargetAttempts,
  getAroundTheClockCompletedTargets,
} from './aroundTheClockTargetHits'

const sampleVisit = (overrides: Partial<Visit> = {}): Visit => ({
  visitIndex: 0,
  playerId: 'player-1',
  darts: [],
  visitScore: 0,
  scoreBefore: 0,
  scoreAfter: 0,
  bust: false,
  checkout: false,
  ...overrides,
})

const failedAttempt = (targetIndex: number, label: string) => ({
  targetIndex,
  label,
  dartsToHit: null,
  hit: false,
})

describe('aroundTheClockTargetHits', () => {
  it('records darts to hit for a successful single-target visit', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 4,
          scoreAfter: 5,
          darts: [missDart(), numberDart(5, DartMultiplier.Single)],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([
      failedAttempt(4, '5'),
      {
        targetIndex: 4,
        label: '5',
        dartsToHit: 2,
        hit: true,
      },
    ])
  })

  it('records failed attempts when the target is not hit', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 4,
          scoreAfter: 4,
          darts: [missDart(), missDart(), missDart()],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([failedAttempt(4, '5'), failedAttempt(4, '5'), failedAttempt(4, '5')])
  })

  it('records multiple targets hit in one visit', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 0,
          scoreAfter: 2,
          darts: [
            numberDart(1, DartMultiplier.Single),
            numberDart(2, DartMultiplier.Single),
            missDart(),
          ],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([
      { targetIndex: 0, label: '1', dartsToHit: 1, hit: true },
      { targetIndex: 1, label: '2', dartsToHit: 1, hit: true },
      failedAttempt(2, '3'),
    ])
  })

  it('counts cumulative darts across visits for target 1 miss miss miss hit', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 0,
          scoreAfter: 0,
          darts: [missDart(), missDart(), missDart()],
        }),
        sampleVisit({
          visitIndex: 1,
          scoreBefore: 0,
          scoreAfter: 1,
          darts: [numberDart(1, DartMultiplier.Single)],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([
      failedAttempt(0, '1'),
      failedAttempt(0, '1'),
      failedAttempt(0, '1'),
      { targetIndex: 0, label: '1', dartsToHit: 4, hit: true },
    ])

    const targets = aggregatePerTargetStats(attempts)

    expect(targets[0]).toMatchObject({
      label: '1',
      attemptCount: 4,
      hitCount: 1,
      bestDarts: 4,
      avgDartsPerHit: 4,
    })
  })

  it('counts cumulative darts across visits for other targets', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 4,
          scoreAfter: 4,
          darts: [missDart(), missDart(), missDart()],
        }),
        sampleVisit({
          visitIndex: 1,
          scoreBefore: 4,
          scoreAfter: 5,
          darts: [numberDart(5, DartMultiplier.Double)],
        }),
      ],
      AroundTheClockAimMode.Doubles,
    )

    expect(attempts).toEqual([
      failedAttempt(4, '5'),
      failedAttempt(4, '5'),
      failedAttempt(4, '5'),
      { targetIndex: 4, label: '5', dartsToHit: 4, hit: true },
    ])
  })

  it('returns completed targets for the sidebar', () => {
    const completed = getAroundTheClockCompletedTargets(
      [
        sampleVisit({
          scoreBefore: 0,
          scoreAfter: 2,
          darts: [
            numberDart(1, DartMultiplier.Double),
            numberDart(2, DartMultiplier.Double),
            missDart(),
          ],
        }),
        sampleVisit({
          visitIndex: 1,
          scoreBefore: 2,
          scoreAfter: 2,
          darts: [missDart(), missDart(), missDart()],
        }),
      ],
      AroundTheClockAimMode.Doubles,
    )

    expect(completed).toEqual([
      { label: '1', dartsToHit: 1 },
      { label: '2', dartsToHit: 1 },
    ])
  })

  it('returns cumulative darts in sidebar after cross-visit target clearance', () => {
    const completed = getAroundTheClockCompletedTargets(
      [
        sampleVisit({
          scoreBefore: 0,
          scoreAfter: 0,
          darts: [missDart(), missDart(), missDart()],
        }),
        sampleVisit({
          visitIndex: 1,
          scoreBefore: 0,
          scoreAfter: 1,
          darts: [numberDart(1, DartMultiplier.Single)],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(completed).toEqual([{ label: '1', dartsToHit: 4 }])
  })

  it('accepts outer bull for any-mode final target', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 20,
          scoreAfter: 21,
          checkout: true,
          darts: [outerBullDart(DartMultiplier.Single)],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([{ targetIndex: 20, label: 'Bull', dartsToHit: 1, hit: true }])
  })

  it('accepts inner bull for any-mode final target', () => {
    const attempts = extractAroundTheClockTargetAttempts(
      [
        sampleVisit({
          scoreBefore: 20,
          scoreAfter: 21,
          checkout: true,
          darts: [bullDart()],
        }),
      ],
      AroundTheClockAimMode.Any,
    )

    expect(attempts).toEqual([{ targetIndex: 20, label: 'Bull', dartsToHit: 1, hit: true }])
  })
})
