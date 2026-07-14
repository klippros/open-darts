import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { Visit } from '../../types/visit'
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

    expect(attempts).toEqual([
      {
        targetIndex: 4,
        label: '5',
        dartsToHit: null,
        hit: false,
      },
    ])
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
      { targetIndex: 2, label: '3', dartsToHit: null, hit: false },
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
