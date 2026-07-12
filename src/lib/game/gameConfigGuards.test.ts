import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { toCheckoutSuggestionRules } from './gameConfigGuards'
import { suggestCheckoutPath } from '../checkout/checkoutSuggestions'

describe('toCheckoutSuggestionRules', () => {
  it('returns checkout rules for x01', () => {
    const rules = toCheckoutSuggestionRules(GameModeId.X01, {
      startScore: 501,
      doubleIn: true,
      doubleOut: true,
    })

    expect(rules).toEqual({
      doubleIn: true,
      doubleOut: true,
    })
  })

  it('returns checkout rules for 121', () => {
    const rules = toCheckoutSuggestionRules(GameModeId.OneTwentyOne, {
      startScore: 121,
      increment: 1,
      doubleOut: true,
    })

    expect(rules).toEqual({
      doubleIn: false,
      doubleOut: true,
    })
  })

  it('returns checkout rules for 10-up-1-down', () => {
    const rules = toCheckoutSuggestionRules(GameModeId.TenUpOneDown, {
      startScore: 10,
      doubleOut: true,
    })

    expect(rules).toEqual({
      doubleIn: false,
      doubleOut: true,
    })
  })

  it('returns null for practice modes without checkout', () => {
    expect(
      toCheckoutSuggestionRules(GameModeId.Bob27, {
        startScore: 27,
      }),
    ).toBeNull()

    expect(
      toCheckoutSuggestionRules(GameModeId.AroundTheClock, {
        finishOnBull: true,
      }),
    ).toBeNull()
  })

  it('enables PDC suggestions for all checkout-capable modes', () => {
    const modes = [
      {
        mode: GameModeId.X01,
        config: { startScore: 501, doubleIn: false, doubleOut: true },
      },
      {
        mode: GameModeId.OneTwentyOne,
        config: { startScore: 121, increment: 1, doubleOut: true },
      },
      {
        mode: GameModeId.TenUpOneDown,
        config: { startScore: 10, doubleOut: true },
      },
    ] as const

    for (const { mode, config } of modes) {
      const rules = toCheckoutSuggestionRules(mode, config)

      expect(rules).not.toBeNull()
      expect(suggestCheckoutPath(170, 3, rules!)).toEqual([
        { label: 'T20', points: 60 },
        { label: 'T20', points: 60 },
        { label: 'Bull', points: 50 },
      ])
    }
  })
})
