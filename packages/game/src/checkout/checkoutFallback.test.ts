import { describe, expect, it } from 'vitest'
import { getSingleDartFinish, findFallbackCheckoutPath } from './checkoutFallback'
import { suggestCheckoutPath } from './checkoutSuggestions'

const doubleOutRules = {
  doubleIn: false,
  doubleOut: true,
}

const pathLabels = (path: { label: string }[] | null): string[] =>
  path?.map((dart) => dart.label) ?? []

describe('checkoutFallback', () => {
  it('finishes missing doubles in one dart', () => {
    expect(getSingleDartFinish(14, doubleOutRules)).toEqual({ label: 'D7', points: 14 })
    expect(getSingleDartFinish(18, doubleOutRules)).toEqual({ label: 'D9', points: 18 })
    expect(getSingleDartFinish(22, doubleOutRules)).toEqual({ label: 'D11', points: 22 })
    expect(getSingleDartFinish(26, doubleOutRules)).toEqual({ label: 'D13', points: 26 })
  })

  it('prefers common doubles over D1 for odd two-dart finishes', () => {
    expect(pathLabels(findFallbackCheckoutPath(5, 2, doubleOutRules))).toEqual(['1', 'D2'])
    expect(pathLabels(findFallbackCheckoutPath(9, 2, doubleOutRules))).toEqual(['1', 'D4'])
    expect(pathLabels(findFallbackCheckoutPath(17, 2, doubleOutRules))).toEqual(['1', 'D8'])
    expect(pathLabels(findFallbackCheckoutPath(23, 2, doubleOutRules))).toEqual(['3', 'D10'])
    expect(pathLabels(findFallbackCheckoutPath(25, 2, doubleOutRules))).toEqual(['5', 'D10'])
  })

  it('suggests sensible checkout paths for scores 2 to 40', () => {
    const expectedPaths: Record<number, string[]> = {
      2: ['D1'],
      3: ['1', 'D1'],
      4: ['D2'],
      5: ['1', 'D2'],
      6: ['D3'],
      7: ['3', 'D2'],
      8: ['D4'],
      9: ['1', 'D4'],
      10: ['D5'],
      11: ['3', 'D4'],
      12: ['D6'],
      13: ['1', 'D6'],
      14: ['D7'],
      15: ['3', 'D6'],
      16: ['D8'],
      17: ['1', 'D8'],
      18: ['D9'],
      19: ['3', 'D8'],
      20: ['D10'],
      21: ['1', 'D10'],
      22: ['D11'],
      23: ['3', 'D10'],
      24: ['D12'],
      25: ['5', 'D10'],
      26: ['D13'],
      27: ['7', 'D10'],
      28: ['D14'],
      29: ['9', 'D10'],
      30: ['D15'],
      31: ['11', 'D10'],
      32: ['D16'],
      33: ['1', 'D16'],
      34: ['D17'],
      35: ['3', 'D16'],
      36: ['D18'],
      37: ['5', 'D16'],
      38: ['D19'],
      39: ['7', 'D16'],
      40: ['D20'],
    }

    for (let score = 2; score <= 40; score += 1) {
      const path = suggestCheckoutPath(score, 3, doubleOutRules)

      expect(pathLabels(path), `score ${score}`).toEqual(expectedPaths[score])
    }
  })
})
