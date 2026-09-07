import type { CheckoutRules } from '../../types/checkout'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import type { X01Config } from '../../types/x01'

export const DEFAULT_ONE_TWENTY_ONE_CONFIG = {
  startScore: 121,
  increment: 1,
  startingLives: 3,
  maxVisitsPerTarget: 3,
  doubleOut: true,
} satisfies OneTwentyOneConfig

export const toOneTwentyOneX01Config = (config: OneTwentyOneConfig): X01Config => ({
  startScore: config.startScore,
  doubleIn: false,
  doubleOut: config.doubleOut,
})

export const toOneTwentyOneCheckoutRules = (config: OneTwentyOneConfig): CheckoutRules => ({
  doubleIn: false,
  doubleOut: config.doubleOut,
})
