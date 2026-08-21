import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { getVoiceRecognitionPhrases } from './speechRecognitionPhrases'

describe('getVoiceRecognitionPhrases', () => {
  it('includes meta commands for every voice mode', () => {
    for (const mode of [GameModeId.Bob27, GameModeId.AroundTheClock, GameModeId.X01]) {
      const phrases = getVoiceRecognitionPhrases(mode)
      expect(phrases.some((hint) => hint.phrase === 'undo')).toBe(true)
      expect(phrases.some((hint) => hint.phrase === 'fix')).toBe(true)
    }
  })

  it('boosts visit-score vocabulary for X01-family modes', () => {
    const phrases = getVoiceRecognitionPhrases(GameModeId.X01)
    const byPhrase = Object.fromEntries(phrases.map((hint) => [hint.phrase, hint.boost]))

    expect(byPhrase['no score']).toBeGreaterThanOrEqual(5)
    expect(byPhrase['one eighty']).toBeGreaterThanOrEqual(4)
    expect(byPhrase.six).toBeGreaterThanOrEqual(5)
    expect(byPhrase['6']).toBeGreaterThanOrEqual(3)
    expect(byPhrase.twelve).toBeGreaterThanOrEqual(2)
    // Do not bias "hundred" — silence often becomes "a hundred".
    expect(byPhrase.hundred).toBeUndefined()
    expect(byPhrase['a hundred']).toBeUndefined()
    expect(byPhrase['one hundred']).toBeUndefined()
    expect(byPhrase.undo).toBeLessThanOrEqual(3)
  })

  it('boosts bob27 hit vocabulary', () => {
    const phrases = getVoiceRecognitionPhrases(GameModeId.Bob27)
    const byPhrase = Object.fromEntries(phrases.map((hint) => [hint.phrase, hint.boost]))

    expect(byPhrase['two hits']).toBeGreaterThanOrEqual(7)
    expect(byPhrase['no hits']).toBeGreaterThanOrEqual(8)
    expect(byPhrase['no hits']).toBeGreaterThan(byPhrase['missed all'] ?? 0)
    expect(byPhrase['miss all'] ?? 0).toBeLessThanOrEqual(6)
    expect(byPhrase.hit).toBeUndefined()
    expect(byPhrase.miss).toBeUndefined()
  })

  it('does not boost hit/miss sequences for around the clock', () => {
    const phrases = getVoiceRecognitionPhrases(GameModeId.AroundTheClock)
    const byPhrase = Object.fromEntries(phrases.map((hint) => [hint.phrase, hint.boost]))

    expect(byPhrase['no hits']).toBeGreaterThanOrEqual(8)
    expect(byPhrase['hit miss hit']).toBeUndefined()
    expect(byPhrase['miss miss miss']).toBeUndefined()
    expect(byPhrase.hit).toBeUndefined()
    expect(byPhrase.miss).toBeUndefined()
  })
})
