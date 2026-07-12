import { describe, expect, it } from 'vitest'
import { PlayerKind } from '../../types/player'
import { formatLegWinScore } from './matchLegDisplay'

describe('formatLegWinScore', () => {
  it('formats leg wins as a colon-separated score for two players', () => {
    expect(
      formatLegWinScore(
        [
          { id: 'p1', name: 'Timon', kind: PlayerKind.Human },
          { id: 'p2', name: 'Thore', kind: PlayerKind.Human },
        ],
        {
          legsToWin: 2,
          startingPlayerIndex: 0,
          currentLeg: 3,
          legWins: { p1: 0, p2: 2 },
        },
      ),
    ).toBe('0:2')
  })

  it('returns null for solo matches', () => {
    expect(
      formatLegWinScore([{ id: 'p1', name: 'Timon', kind: PlayerKind.Human }], {
        legsToWin: 3,
        startingPlayerIndex: 0,
        currentLeg: 2,
        legWins: { p1: 1 },
      }),
    ).toBeNull()
  })
})
