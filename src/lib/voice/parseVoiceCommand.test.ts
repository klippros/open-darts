import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
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

    it('parses fix with gameplay body and rejects fix synonyms', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'fix hit 2')).toEqual({
        kind: VoiceIntentKind.Fix,
        inner: { kind: VoiceIntentKind.Bob27HitCount, hitCount: 2 },
      })
      expect(parseVoiceCommand(GameModeId.Bob27, 'correct hit 2')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'fix')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'fix undo')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'fix fix hit 2')).toBeNull()
    })
  })

  describe('unsupported modes', () => {
    it.each([GameModeId.X01, GameModeId.OneTwentyOne, GameModeId.TenUpOneDown])(
      'returns null for all phrases in %s',
      (mode) => {
        expect(parseVoiceCommand(mode, 'undo')).toBeNull()
        expect(parseVoiceCommand(mode, 'one hit')).toBeNull()
        expect(parseVoiceCommand(mode, 'hit miss hit')).toBeNull()
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
    })

    it('rejects near-miss bob27 phrases', () => {
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit 0')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'hit')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'miss')).toBeNull()
      expect(parseVoiceCommand(GameModeId.Bob27, 'miss all')).toBeNull()
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
    })

    it('rejects hit counts and dart phrases', () => {
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit two')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'two hits')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'one hit')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit 1')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit 1st')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'miss all')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'missed')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'double 20')).toBeNull()
      expect(parseVoiceCommand(GameModeId.AroundTheClock, 'hit hit hit hit')).toBeNull()
    })
  })
})
