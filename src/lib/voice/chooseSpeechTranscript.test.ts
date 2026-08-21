import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { chooseSpeechTranscript, looksLikeTruncatedFinal } from './chooseSpeechTranscript'

describe('looksLikeTruncatedFinal', () => {
  it('detects hit two → hit', () => {
    expect(looksLikeTruncatedFinal('Hit two', 'Hit')).toBe(true)
  })

  it('is false when final is not a prefix', () => {
    expect(looksLikeTruncatedFinal('hit two', 'miss')).toBe(false)
  })
})

describe('chooseSpeechTranscript', () => {
  const choose = (final: string, interim: string | null, mode = GameModeId.Bob27) =>
    chooseSpeechTranscript(mode, final, interim)

  it('uses final when there is no interim', () => {
    expect(choose('hit 2', null)).toBe('hit 2')
  })

  it('uses interim when only interim parses', () => {
    expect(choose('please score now', 'hit 2')).toBe('hit 2')
  })

  it('keeps final when both parse to the same command', () => {
    expect(choose('hit two', 'hit 2')).toBe('hit two')
  })

  it('prefers interim when final truncates a richer phrase', () => {
    expect(choose('Hit', 'Hit two')).toBe('Hit two')
    expect(choose('hit hit', 'hit hit miss', GameModeId.AroundTheClock)).toBe('hit hit miss')
  })

  it('always prefers final undo over a stale interim command', () => {
    expect(choose('undo', 'hit 2')).toBe('undo')
  })
})
