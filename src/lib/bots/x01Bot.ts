import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import type { BotSkillLevel } from '../../types/player'
import type { X01State } from '../../types/x01'
import { isDoubleDart, sumDartPoints } from '../dartScoring'
import { isInCheckoutRange, suggestCheckoutPath } from '../x01/x01CheckoutSuggestions'
import { getBotSkillProfile } from './botSkill'
import {
  createDoubleDart,
  createMissDart,
  createSingleDart,
  createTripleDart,
  dartFromCheckoutLabel,
} from './dartFactory'

export interface X01BotDartContext {
  state: X01State
  playerId: string
  pendingDarts: DartThrow[]
  skillLevel: BotSkillLevel
  random?: () => number
}

const getRandom = (random: (() => number) | undefined): number => random?.() ?? Math.random()

const rollHit = (hitRate: number, random: () => number): boolean => random() < hitRate

const getPlayerState = (state: X01State, playerId: string) => {
  const playerState = state.players[playerId]

  if (playerState === undefined) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  return playerState
}

const resolveScoringMiss = (
  targetValue: number,
  timestamp: string,
  random: () => number,
): DartThrow => {
  if (random() < 0.5) {
    return createSingleDart(targetValue, timestamp)
  }

  return createMissDart(timestamp)
}

const resolveCheckoutMiss = (
  target: DartThrow,
  timestamp: string,
  random: () => number,
): DartThrow => {
  if (
    target.multiplier === DartMultiplier.Triple &&
    target.segment.type === DartSegmentType.Number
  ) {
    return createSingleDart(target.segment.value, timestamp)
  }

  if (
    target.multiplier === DartMultiplier.Double &&
    target.segment.type === DartSegmentType.Number &&
    random() < 0.4
  ) {
    return createSingleDart(target.segment.value, timestamp)
  }

  return createMissDart(timestamp)
}

export const generateX01BotDart = ({
  state,
  playerId,
  pendingDarts,
  skillLevel,
  random,
}: X01BotDartContext): DartThrow => {
  const timestamp = new Date().toISOString()
  const randomFn = () => getRandom(random)
  const profile = getBotSkillProfile(skillLevel)
  const playerState = getPlayerState(state, playerId)
  const { config } = state
  const pendingScore = sumDartPoints(pendingDarts)
  const remaining = playerState.remaining - pendingScore
  const dartsRemaining = 3 - pendingDarts.length
  const hasOpened =
    playerState.hasOpened || pendingDarts.some((dart) => isDoubleDart(dart) && dart.points > 0)

  if (config.doubleIn && !hasOpened) {
    const target = createDoubleDart(20, timestamp)

    if (rollHit(profile.doubleInHitRate, randomFn)) {
      return target
    }

    return resolveScoringMiss(20, timestamp, randomFn)
  }

  const checkoutPath =
    isInCheckoutRange(remaining, config) && dartsRemaining > 0
      ? suggestCheckoutPath(remaining, dartsRemaining, config)
      : null

  if (checkoutPath !== null && checkoutPath.length > 0) {
    const nextLabel = checkoutPath[pendingDarts.length]

    if (nextLabel !== undefined) {
      const target = dartFromCheckoutLabel(nextLabel.label, timestamp)

      if (rollHit(profile.checkoutHitRate, randomFn)) {
        return target
      }

      return resolveCheckoutMiss(target, timestamp, randomFn)
    }
  }

  const scoringTarget = createTripleDart(20, timestamp)

  if (rollHit(profile.scoringHitRate, randomFn)) {
    return scoringTarget
  }

  return resolveScoringMiss(20, timestamp, randomFn)
}
