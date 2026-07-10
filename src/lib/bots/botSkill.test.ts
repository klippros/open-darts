import { describe, expect, it } from 'vitest'
import {
  clampBotSkillLevel,
  formatBotEstimatedThreeDartAverage,
  getBotEstimatedThreeDartAverage,
  getBotSkillProfile,
  parseBotSkillLevel,
} from './botSkill'

describe('botSkill', () => {
  it('clamps bot levels to the supported range', () => {
    expect(clampBotSkillLevel(0)).toBe(1)
    expect(clampBotSkillLevel(11)).toBe(10)
    expect(clampBotSkillLevel(4.6)).toBe(5)
  })

  it('parses numeric and legacy bot level params', () => {
    expect(parseBotSkillLevel('7')).toBe(7)
    expect(parseBotSkillLevel('intermediate')).toBe(5)
    expect(parseBotSkillLevel(null)).toBe(5)
  })

  it('returns higher hit rates and averages for higher levels', () => {
    const beginner = getBotSkillProfile(1)
    const advanced = getBotSkillProfile(10)

    expect(advanced.scoringHitRate).toBeGreaterThan(beginner.scoringHitRate)
    expect(getBotEstimatedThreeDartAverage(10)).toBeGreaterThan(getBotEstimatedThreeDartAverage(1))
    expect(formatBotEstimatedThreeDartAverage(1)).toBe('25.0')
    expect(formatBotEstimatedThreeDartAverage(10)).toBe('100.0')
  })
})
