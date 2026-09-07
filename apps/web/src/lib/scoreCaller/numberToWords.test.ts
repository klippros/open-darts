import { describe, expect, it } from 'vitest'
import { numberToWords } from './numberToWords'

describe('numberToWords', () => {
  it('converts common dart scores', () => {
    expect(numberToWords(0)).toBe('zero')
    expect(numberToWords(40)).toBe('forty')
    expect(numberToWords(108)).toBe('one hundred eight')
    expect(numberToWords(501)).toBe('five hundred one')
    expect(numberToWords(81)).toBe('eighty one')
    expect(numberToWords(124)).toBe('one hundred twenty four')
  })

  it('handles negatives', () => {
    expect(numberToWords(-2)).toBe('minus two')
  })
})
