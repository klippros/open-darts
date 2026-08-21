import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { isVoiceInputSupportedForMode } from './voiceModeSupport'

describe('isVoiceInputSupportedForMode', () => {
  it('allows Bob’s 27 and Around the Clock', () => {
    expect(isVoiceInputSupportedForMode(GameModeId.Bob27)).toBe(true)
    expect(isVoiceInputSupportedForMode(GameModeId.AroundTheClock)).toBe(true)
  })

  it('disables X01, 121, and 10-up-1-down', () => {
    expect(isVoiceInputSupportedForMode(GameModeId.X01)).toBe(false)
    expect(isVoiceInputSupportedForMode(GameModeId.OneTwentyOne)).toBe(false)
    expect(isVoiceInputSupportedForMode(GameModeId.TenUpOneDown)).toBe(false)
  })
})
