import { describe, expect, it } from 'vitest'
import { ChallengeLegEndMode, ChallengeLegStatus } from '../../types/match'
import {
  clampMaxVisits,
  countPlayerVisitsInLeg,
  formatChallengeTargetLabel,
  formatChallengeVisitProgressLabel,
  getChallengeLegStatuses,
  getChallengeMaxLegs,
  getMinVisits,
  getTargetThreeDartAverage,
  parseChallengeLegEndMode,
  parseMaxVisits,
  resolveChallengeLegOutcome,
  shouldEndLegAtVisitLimit,
} from './challenge'
import type { Visit } from '../../types/visit'

describe('challenge', () => {
  it('derives min visits from start score', () => {
    expect(getMinVisits(501)).toBe(3)
    expect(getMinVisits(401)).toBe(3)
    expect(getMinVisits(301)).toBe(2)
  })

  it('calculates target three-dart average', () => {
    expect(getTargetThreeDartAverage(501, 5)).toBeCloseTo(100.2)
    expect(formatChallengeTargetLabel(501, 5)).toBe('5 visits · up to 15 darts · ~100.2 avg')
  })

  it('clamps max visits to score-aware bounds', () => {
    expect(clampMaxVisits(2, 501)).toBe(3)
    expect(clampMaxVisits(99, 501)).toBe(20)
    expect(parseMaxVisits(null, 501)).toBe(9)
    expect(parseMaxVisits('5', 501)).toBe(5)
  })

  it('parses challenge leg end mode', () => {
    expect(parseChallengeLegEndMode(null)).toBe(ChallengeLegEndMode.PlayToCheckout)
    expect(parseChallengeLegEndMode('stop-at-limit')).toBe(ChallengeLegEndMode.StopAtLimit)
  })

  it('counts player visits in a leg', () => {
    const visits: Visit[] = [
      {
        visitIndex: 0,
        playerId: 'human',
        darts: [],
        visitScore: 60,
        scoreBefore: 501,
        scoreAfter: 441,
        bust: false,
        checkout: false,
        legIndex: 1,
      },
      {
        visitIndex: 1,
        playerId: 'human',
        darts: [],
        visitScore: 100,
        scoreBefore: 441,
        scoreAfter: 341,
        bust: false,
        checkout: false,
        legIndex: 1,
      },
    ]

    expect(countPlayerVisitsInLeg(visits, 1, 'human')).toBe(2)
  })

  it('shows over limit only after exceeding max visits', () => {
    expect(formatChallengeVisitProgressLabel(5, 5, 82)).toBe('Visit 5 / 5')
    expect(formatChallengeVisitProgressLabel(6, 5, 82)).toBe('Visit 6 / 5 · over limit')
  })

  it('resolves challenge leg outcomes for checkout and stop-at-limit', () => {
    const challenge = {
      maxVisits: 5,
      legEndMode: ChallengeLegEndMode.StopAtLimit,
    }

    expect(resolveChallengeLegOutcome(challenge, 4, 82, false)).toBeNull()
    expect(resolveChallengeLegOutcome(challenge, 5, 82, false)).toBe(ChallengeLegStatus.Lost)
    expect(resolveChallengeLegOutcome(challenge, 5, 0, true)).toBe(ChallengeLegStatus.Won)
    expect(resolveChallengeLegOutcome(challenge, 6, 0, true)).toBe(ChallengeLegStatus.Lost)
  })

  it('detects stop-at-limit leg end', () => {
    expect(shouldEndLegAtVisitLimit(ChallengeLegEndMode.StopAtLimit, 5, 5, 82)).toBe(true)
    expect(shouldEndLegAtVisitLimit(ChallengeLegEndMode.StopAtLimit, 5, 5, 0)).toBe(false)
    expect(shouldEndLegAtVisitLimit(ChallengeLegEndMode.PlayToCheckout, 5, 5, 82)).toBe(false)
  })

  it('tracks leg statuses for a first-to-three challenge match', () => {
    expect(getChallengeMaxLegs(3)).toBe(5)

    const matchProgress = {
      legsToWin: 3,
      startingPlayerIndex: 0,
      currentLeg: 3,
      legWins: { human: 1 },
      legLosses: 1,
      challenge: {
        maxVisits: 2,
        legEndMode: ChallengeLegEndMode.StopAtLimit,
      },
    }

    const visits: Visit[] = [
      {
        visitIndex: 0,
        playerId: 'human',
        darts: [],
        visitScore: 40,
        scoreBefore: 40,
        scoreAfter: 0,
        bust: false,
        checkout: true,
        legIndex: 1,
      },
      {
        visitIndex: 1,
        playerId: 'human',
        darts: [],
        visitScore: 20,
        scoreBefore: 40,
        scoreAfter: 20,
        bust: false,
        checkout: false,
        legIndex: 2,
      },
      {
        visitIndex: 2,
        playerId: 'human',
        darts: [],
        visitScore: 20,
        scoreBefore: 20,
        scoreAfter: 0,
        bust: false,
        checkout: true,
        legIndex: 2,
      },
    ]

    expect(getChallengeLegStatuses(visits, 'human', matchProgress)).toEqual([
      ChallengeLegStatus.Won,
      ChallengeLegStatus.Won,
      ChallengeLegStatus.Current,
      ChallengeLegStatus.Upcoming,
      ChallengeLegStatus.Upcoming,
    ])
  })

  it('marks lost legs as unfilled in leg status order', () => {
    const matchProgress = {
      legsToWin: 2,
      startingPlayerIndex: 0,
      currentLeg: 2,
      legWins: { human: 0 },
      legLosses: 1,
      challenge: {
        maxVisits: 1,
        legEndMode: ChallengeLegEndMode.StopAtLimit,
      },
    }

    const visits: Visit[] = [
      {
        visitIndex: 0,
        playerId: 'human',
        darts: [],
        visitScore: 20,
        scoreBefore: 40,
        scoreAfter: 20,
        bust: false,
        checkout: false,
        legIndex: 1,
      },
    ]

    expect(getChallengeLegStatuses(visits, 'human', { ...matchProgress, currentLeg: 2 })).toEqual([
      ChallengeLegStatus.Lost,
      ChallengeLegStatus.Current,
      ChallengeLegStatus.Upcoming,
    ])
  })
})
