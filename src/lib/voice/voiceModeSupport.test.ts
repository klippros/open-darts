import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { X01InputMode } from '../../types/settings'
import { isVoiceInputSupportedForMode } from './voiceModeSupport'

describe('isVoiceInputSupportedForMode', () => {
  it('allows Bob’s 27 and Around the Clock', () => {
    expect(isVoiceInputSupportedForMode(GameModeId.Bob27)).toBe(true)
    expect(isVoiceInputSupportedForMode(GameModeId.AroundTheClock)).toBe(true)
  })

  it('disables X01-family modes on board input', () => {
    expect(isVoiceInputSupportedForMode(GameModeId.X01)).toBe(false)
    expect(isVoiceInputSupportedForMode(GameModeId.OneTwentyOne)).toBe(false)
    expect(isVoiceInputSupportedForMode(GameModeId.TenUpOneDown)).toBe(false)
  })

  it('enables X01-family modes when visit-score input is selected', () => {
    expect(
      isVoiceInputSupportedForMode(GameModeId.X01, { x01InputMode: X01InputMode.VisitScore }),
    ).toBe(true)
    expect(
      isVoiceInputSupportedForMode(GameModeId.OneTwentyOne, {
        x01InputMode: X01InputMode.VisitScore,
      }),
    ).toBe(true)
    expect(
      isVoiceInputSupportedForMode(GameModeId.TenUpOneDown, {
        x01InputMode: X01InputMode.VisitScore,
      }),
    ).toBe(true)
  })
})
