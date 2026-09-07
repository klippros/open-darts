import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import type { Visit } from '../../types/visit'
import { getVisitHistoryEntryDisplay } from './visitHistoryDisplay'

const baseVisit: Visit = {
  visitIndex: 0,
  playerId: 'p1',
  darts: [],
  visitScore: 60,
  scoreBefore: 60,
  scoreAfter: 59,
  bust: false,
  checkout: false,
}

describe('getVisitHistoryEntryDisplay', () => {
  it('shows the next target after a successful checkout practice visit', () => {
    const display = getVisitHistoryEntryDisplay(
      { ...baseVisit, checkout: true, scoreAfter: 70 },
      GameModeId.TenUpOneDown,
    )

    expect(display).toEqual({
      headline: '70',
      tone: 'success',
    })
  })

  it('shows scoring visits like x01 in 121', () => {
    const display = getVisitHistoryEntryDisplay(
      { ...baseVisit, visitScore: 60, scoreBefore: 121, scoreAfter: 61 },
      GameModeId.OneTwentyOne,
    )

    expect(display).toEqual({
      headline: '60',
      tone: 'default',
    })
  })

  it('shows bust visits in 121', () => {
    const display = getVisitHistoryEntryDisplay(
      { ...baseVisit, bust: true, scoreBefore: 121, visitScore: 0, scoreAfter: 121 },
      GameModeId.OneTwentyOne,
    )

    expect(display).toEqual({
      headline: 'BUST',
      tone: 'failed',
    })
  })

  it('shows lost life visits in 121', () => {
    const display = getVisitHistoryEntryDisplay(
      {
        ...baseVisit,
        scoreAfter: 120,
        metadata: { roundFailed: true },
      },
      GameModeId.OneTwentyOne,
    )

    expect(display).toEqual({
      headline: '120',
      sublabel: 'Lost life',
      tone: 'failed',
    })
  })

  it('keeps x01 visit scores for regular scoring visits', () => {
    const display = getVisitHistoryEntryDisplay(
      { ...baseVisit, visitScore: 60, scoreBefore: 501, scoreAfter: 441 },
      GameModeId.X01,
    )

    expect(display).toEqual({
      headline: '60',
      tone: 'default',
    })
  })

  it('keeps bust labeling for x01', () => {
    const display = getVisitHistoryEntryDisplay(
      { ...baseVisit, bust: true, visitScore: 0 },
      GameModeId.X01,
    )

    expect(display).toEqual({
      headline: 'BUST',
      tone: 'failed',
    })
  })
})
