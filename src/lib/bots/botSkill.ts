import {
  BOT_SKILL_LEVEL_MAX,
  BOT_SKILL_LEVEL_MIN,
  DEFAULT_BOT_SKILL_LEVEL,
} from '../../types/player'
import type { BotSkillLevel } from '../../types/player'

export interface BotSkillProfile {
  scoringHitRate: number
  checkoutHitRate: number
  doubleInHitRate: number
}

const LEGACY_BOT_LEVELS: Record<string, BotSkillLevel> = {
  beginner: 2,
  intermediate: 5,
  advanced: 8,
}

const MIN_ESTIMATED_AVERAGE = 25
const MAX_ESTIMATED_AVERAGE = 100

export const clampBotSkillLevel = (level: number): BotSkillLevel =>
  Math.min(BOT_SKILL_LEVEL_MAX, Math.max(BOT_SKILL_LEVEL_MIN, Math.round(level)))

const getNormalizedLevel = (level: BotSkillLevel): number =>
  (clampBotSkillLevel(level) - BOT_SKILL_LEVEL_MIN) / (BOT_SKILL_LEVEL_MAX - BOT_SKILL_LEVEL_MIN)

const interpolate = (level: BotSkillLevel, min: number, max: number): number => {
  const normalized = getNormalizedLevel(level)

  return min + normalized * (max - min)
}

export const parseBotSkillLevel = (value: string | null | undefined): BotSkillLevel => {
  if (value === null || value === undefined || value.trim() === '') {
    return DEFAULT_BOT_SKILL_LEVEL
  }

  const legacyLevel = LEGACY_BOT_LEVELS[value.toLowerCase()]

  if (legacyLevel !== undefined) {
    return legacyLevel
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BOT_SKILL_LEVEL
  }

  return clampBotSkillLevel(parsed)
}

export const normalizeBotSkillLevel = (
  level: BotSkillLevel | string | undefined,
): BotSkillLevel => {
  if (level === undefined) {
    return DEFAULT_BOT_SKILL_LEVEL
  }

  if (typeof level === 'number') {
    return clampBotSkillLevel(level)
  }

  return parseBotSkillLevel(level)
}

export const getBotSkillProfile = (level: BotSkillLevel): BotSkillProfile => ({
  scoringHitRate: interpolate(level, 0.38, 0.91),
  checkoutHitRate: interpolate(level, 0.18, 0.82),
  doubleInHitRate: interpolate(level, 0.32, 0.8),
})

export const getBotEstimatedThreeDartAverage = (level: BotSkillLevel): number => {
  const normalized = getNormalizedLevel(level)
  const average =
    MIN_ESTIMATED_AVERAGE + normalized * (MAX_ESTIMATED_AVERAGE - MIN_ESTIMATED_AVERAGE)

  return Math.round(average * 10) / 10
}

export const formatBotEstimatedThreeDartAverage = (level: BotSkillLevel): string =>
  getBotEstimatedThreeDartAverage(level).toFixed(1)
