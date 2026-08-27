import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { X01InputMode } from '../../types/settings'
import { parseVoiceCommand, VoiceIntentKind } from './parseVoiceCommand'

describe('parseVoiceCommand', () => {
  describe('meta', () => {
    it('parses exact undo only', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo')).toEqual({ kind: VoiceIntentKind.Undo })
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'undo')).toEqual({
        kind: VoiceIntentKind.Undo,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo last')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo dart')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo visit')).toBeNull()
    })

    it('rejects stuttered undo noise', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo undo undo undo')).toBeNull()
    })

    it('parses undo with gameplay body as a replacement and rejects fix', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo hit 2')).toEqual({
        kind: VoiceIntentKind.Fix,
        inner: { kind: VoiceIntentKind.Bob27HitCount, hitCount: 2 },
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo two hits')).toEqual({
        kind: VoiceIntentKind.Fix,
        inner: { kind: VoiceIntentKind.Bob27HitCount, hitCount: 2 },
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'correct hit 2')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'fix hit 2')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo undo')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'undo undo hit 2')).toBeNull()
    })
  })

  describe('unsupported modes', () => {
    it.each([GameModeId.X01, GameModeId.OneTwentyOne, GameModeId.TenUpOneDown])(
      'returns null for all phrases in %s without visit-score input',
      (mode) => {
        expect(parseVoiceCommand(mode, 'undo')).toBeNull()
        expect(parseVoiceCommand(mode, 'one hit')).toBeNull()
        expect(parseVoiceCommand(mode, 'hit miss hit')).toBeNull()
        expect(parseVoiceCommand(mode, 'sixty')).toBeNull()
      },
    )
  })

  describe('visit score', () => {
    const options = { x01InputMode: X01InputMode.VisitScore }

    it.each([GameModeId.X01, GameModeId.OneTwentyOne, GameModeId.TenUpOneDown])(
      'parses visit totals for %s',
      (mode) => {
        expect(parseVoiceCommand(mode, 'sixty', options)).toEqual({
          kind: VoiceIntentKind.VisitScore,
          score: 60,
        })
        expect(parseVoiceCommand(mode, 'one eighty', options)).toEqual({
          kind: VoiceIntentKind.VisitScore,
          score: 180,
        })
        expect(parseVoiceCommand(mode, '26', options)).toEqual({
          kind: VoiceIntentKind.VisitScore,
          score: 26,
        })
        expect(parseVoiceCommand(mode, 'no score', options)).toEqual({
          kind: VoiceIntentKind.VisitScore,
          score: 0,
        })
        expect(parseVoiceCommand(mode, '0', options)).toEqual({
          kind: VoiceIntentKind.VisitScore,
          score: 0,
        })
        expect(parseVoiceCommand(mode, 'undo', options)).toEqual({ kind: VoiceIntentKind.Undo })
        expect(parseVoiceCommand(mode, 'undo sixty', options)).toEqual({
          kind: VoiceIntentKind.Fix,
          inner: { kind: VoiceIntentKind.VisitScore, score: 60 },
        })
      },
    )
  })

  describe('bob27', () => {
    it('accepts only hit 1-3 and missed all', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit 1')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 1,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit one')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 1,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit 2')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 2,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit two')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 2,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'two hits')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 2,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'tow hits')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 2,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'one hit')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 1,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'one hits')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'two hit')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit three')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 3,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'missed all')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 0,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'miss all')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 0,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'zero hits')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 0,
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'no hits')).toEqual({
        kind: VoiceIntentKind.Bob27HitCount,
        hitCount: 0,
      })
    })

    it('rejects near-miss bob27 phrases', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit 0')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'miss')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'missed')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'double 20')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, '1')).toBeNull()
    })
  })

  describe('around the clock', () => {
    it('accepts hit/miss sequences and missed all', () => {
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit hit miss')).toEqual({
        kind: VoiceIntentKind.AroundTheClock,
        command: { type: 'sequence', outcomes: ['hit', 'hit', 'miss'] },
      })
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'Hit hit Miss')).toEqual({
        kind: VoiceIntentKind.AroundTheClock,
        command: { type: 'sequence', outcomes: ['hit', 'hit', 'miss'] },
      })
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'miss miss miss')).toEqual({
        kind: VoiceIntentKind.AroundTheClock,
        command: { type: 'sequence', outcomes: ['miss', 'miss', 'miss'] },
      })
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'missed all')).toEqual({
        kind: VoiceIntentKind.AroundTheClock,
        command: { type: 'missed-all' },
      })
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'miss all')).toEqual({
        kind: VoiceIntentKind.AroundTheClock,
        command: { type: 'missed-all' },
      })
    })

    it('rejects hit counts and dart phrases', () => {
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit two')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'two hits')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'one hit')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit 1')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit 1st')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'missed')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'double 20')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit hit hit hit')).toBeNull()
    })

    it('parses undo with a visit sequence as a replacement', () => {
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'undo hit miss miss')).toEqual({
        kind: VoiceIntentKind.Fix,
        inner: {
          kind: VoiceIntentKind.AroundTheClock,
          command: { type: 'sequence', outcomes: ['hit', 'miss', 'miss'] },
        },
      })
    })
  })
})
