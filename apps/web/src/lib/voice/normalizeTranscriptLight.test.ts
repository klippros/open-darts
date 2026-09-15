import { describe, expect, it } from 'vitest'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'

describe('normalizeTranscriptLight', () => {
  it('maps common digit homophones to number words', () => {
    expect(normalizeTranscriptLight('to')).toEqual(['two'])
    expect(normalizeTranscriptLight('for')).toEqual(['four'])
    expect(normalizeTranscriptLight('ate')).toEqual(['eight'])
    expect(normalizeTranscriptLight('won')).toEqual(['one'])
    expect(normalizeTranscriptLight('fix')).toEqual(['six'])
  })
})
