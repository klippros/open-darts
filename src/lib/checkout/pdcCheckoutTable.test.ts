import { describe, expect, it } from 'vitest'
import {
  DOUBLE_OUT_BOGEY_SCORES,
  PDC_CHECKOUT_PATHS,
  sumPdcCheckoutLabels,
  validatePdcCheckoutTable,
} from './pdcCheckoutTable'

describe('pdcCheckoutTable', () => {
  it('has every path sum to its checkout score', () => {
    for (const [scoreKey, labels] of Object.entries(PDC_CHECKOUT_PATHS)) {
      const score = Number(scoreKey)

      expect(sumPdcCheckoutLabels(labels), `${score}: ${labels.join(' + ')}`).toBe(score)
    }
  })

  it('finishes every path on a double or bull', () => {
    for (const [scoreKey, labels] of Object.entries(PDC_CHECKOUT_PATHS)) {
      const lastLabel = labels.at(-1)
      const finishesOnDoubleOrBull =
        lastLabel !== undefined && (lastLabel.startsWith('D') || lastLabel === 'Bull')

      expect(finishesOnDoubleOrBull, `${scoreKey}: ${labels.join(' + ')}`).toBe(true)
    }
  })

  it('covers every checkoutable score from 41 to 170', () => {
    const expectedScores: number[] = []

    for (let score = 41; score <= 170; score += 1) {
      if (!DOUBLE_OUT_BOGEY_SCORES.has(score)) {
        expectedScores.push(score)
      }
    }

    expect(Object.keys(PDC_CHECKOUT_PATHS).map(Number).sort((a, b) => a - b)).toEqual(
      expectedScores,
    )
  })

  it('passes table validation with no issues', () => {
    expect(validatePdcCheckoutTable()).toEqual([])
  })
})
