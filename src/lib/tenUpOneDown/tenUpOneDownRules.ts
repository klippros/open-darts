import type { DartThrow } from '../../types/dart'
import type { CheckoutRules } from '../../types/checkout'
import type { TenUpOneDownConfig } from '../../types/tenUpOneDown'
import type { X01Config } from '../../types/x01'
import { normalizeCheckoutTarget } from '../checkout/checkoutSuggestions'
import { resolveX01Visit } from '../x01/x01Rules'

const toX01Config = (config: TenUpOneDownConfig): X01Config => ({
  startScore: config.startScore,
  doubleIn: false,
  doubleOut: config.doubleOut,
})

const toCheckoutRules = (config: TenUpOneDownConfig): CheckoutRules => ({
  doubleIn: false,
  doubleOut: config.doubleOut,
})

export interface TenUpOneDownVisitOutcome {
  targetScoreAfter: number
  bust: boolean
  checkout: boolean
}

export const resolveTenUpOneDownVisit = (
  targetScore: number,
  darts: DartThrow[],
  config: TenUpOneDownConfig,
): TenUpOneDownVisitOutcome => {
  const outcome = resolveX01Visit(targetScore, darts, toX01Config(config), true)

  const checkoutRules = toCheckoutRules(config)

  if (outcome.checkout) {
    return {
      targetScoreAfter: normalizeCheckoutTarget(targetScore + config.incrementUp, checkoutRules, {
        minScore: config.minScore,
        prefer: 'up',
      }),
      bust: false,
      checkout: true,
    }
  }

  if (outcome.bust || darts.length === 3) {
    return {
      targetScoreAfter: normalizeCheckoutTarget(
        Math.max(config.minScore, targetScore - config.decrementDown),
        checkoutRules,
        { minScore: config.minScore, prefer: 'down' },
      ),
      bust: outcome.bust,
      checkout: false,
    }
  }

  return {
    targetScoreAfter: targetScore,
    bust: false,
    checkout: false,
  }
}
