import { describe, expect, it } from 'vitest'
import { isPathologicalVoiceHypothesis, sanitizeVoiceTranscript } from './sanitizeVoiceTranscript'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'

describe('sanitizeVoiceTranscript', () => {
  it('keeps real short commands', () => {
    expect(sanitizeVoiceTranscript('undo')).toEqual({ transcript: 'undo', resetSession: false })
    expect(sanitizeVoiceTranscript('sixty')).toEqual({ transcript: 'sixty', resetSession: false })
    expect(sanitizeVoiceTranscript('one eighty')).toEqual({
      transcript: 'one eighty',
      resetSession: false,
    })
    expect(sanitizeVoiceTranscript('miss miss miss')).toEqual({
      transcript: 'miss miss miss',
      resetSession: false,
    })
    expect(sanitizeVoiceTranscript('hit miss hit')).toEqual({
      transcript: 'hit miss hit',
      resetSession: false,
    })
    expect(sanitizeVoiceTranscript('12')).toEqual({ transcript: '12', resetSession: false })
  })

  it('rejects undo stutter and does not salvage it', () => {
    expect(sanitizeVoiceTranscript('undo undo undo undo')).toEqual({
      transcript: null,
      resetSession: true,
    })
  })

  it('salvages a trailing multi-digit score from digit thrash', () => {
    const noisy = '1 0 1 0 1 0 1 0 1 0 1 2 1 2 1 2 3 undo undo undo 1 2 1 2 1 2 3 12'
    expect(sanitizeVoiceTranscript(noisy)).toEqual({
      transcript: '12',
      resetSession: true,
    })
  })

  it('does not salvage a thrash that only ends on a repeated single digit', () => {
    expect(sanitizeVoiceTranscript('1 0 1 0 1 0 1 0 1 0')).toEqual({
      transcript: null,
      resetSession: true,
    })
  })

  it('salvages stuttered missed-all even when the stream is truncated', () => {
    expect(
      sanitizeVoiceTranscript(
        'missed all missed all missed all missed all missed all missed all missed all misse',
      ),
    ).toEqual({
      transcript: 'missed all',
      resetSession: true,
    })

    expect(
      sanitizeVoiceTranscript(
        'He missed all missed all missed all missed all missed all missed all missed all',
      ),
    ).toEqual({
      transcript: 'missed all',
      resetSession: true,
    })
  })

  it('does not salvage hit/miss stutter into a guessed visit order', () => {
    expect(sanitizeVoiceTranscript('hit miss hit miss miss hit hit hit hit hit hit')).toEqual({
      transcript: null,
      resetSession: true,
    })
  })

  it('marks long low-diversity streams as pathological', () => {
    const tokens = normalizeTranscriptLight('1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2')
    expect(isPathologicalVoiceHypothesis(tokens)).toBe(true)
  })
})
