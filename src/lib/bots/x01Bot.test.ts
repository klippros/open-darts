import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { generateX01BotDart } from './x01Bot'

const alwaysHit = () => 0
const alwaysMiss = () => 1

const baseState = {
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: {
    bot: { remaining: 501, hasOpened: true },
  },
}

describe('x01Bot', () => {
  it('throws triple twenties when scoring with high hit rate', () => {
    const dart = generateX01BotDart({
      state: baseState,
      playerId: 'bot',
      pendingDarts: [],
      skillLevel: 10,
      random: alwaysHit,
    })

    expect(dart.points).toBe(60)
    expect(dart.multiplier).toBe(DartMultiplier.Triple)
  })

  it('misses more often with low hit rate', () => {
    const dart = generateX01BotDart({
      state: baseState,
      playerId: 'bot',
      pendingDarts: [],
      skillLevel: 1,
      random: alwaysMiss,
    })

    expect(dart.points).toBeLessThan(60)
  })

  it('aims for checkout darts when in range', () => {
    const dart = generateX01BotDart({
      state: {
        ...baseState,
        players: {
          bot: { remaining: 40, hasOpened: true },
        },
      },
      playerId: 'bot',
      pendingDarts: [],
      skillLevel: 10,
      random: alwaysHit,
    })

    expect(dart.points).toBe(40)
    expect(dart.multiplier).toBe(DartMultiplier.Double)
  })
})
