import { describe, expect, it } from 'vitest'
import {
  appendVisitScoreDigit,
  backspaceVisitScoreInput,
  parseVisitScoreInput,
} from './visitScoreInput'

describe('visitScoreInput', () => {
  it('appends digits up to 180', () => {
    expect(appendVisitScoreDigit('', '1')).toBe('1')
    expect(appendVisitScoreDigit('1', '8')).toBe('18')
    expect(appendVisitScoreDigit('18', '0')).toBe('180')
    expect(appendVisitScoreDigit('180', '0')).toBe('180')
    expect(appendVisitScoreDigit('18', '1')).toBe('18')
    expect(appendVisitScoreDigit('17', '9')).toBe('179')
  })

  it('replaces a lone zero when typing the next digit', () => {
    expect(appendVisitScoreDigit('0', '5')).toBe('5')
  })

  it('backspaces one character', () => {
    expect(backspaceVisitScoreInput('26')).toBe('2')
    expect(backspaceVisitScoreInput('')).toBe('')
  })

  it('parses valid scores and rejects empty input', () => {
    expect(parseVisitScoreInput('0')).toBe(0)
    expect(parseVisitScoreInput('26')).toBe(26)
    expect(parseVisitScoreInput('180')).toBe(180)
    expect(parseVisitScoreInput('')).toBeNull()
  })
})
