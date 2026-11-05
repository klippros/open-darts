import { GameModeId } from '../types/gameMode.ts'
import type { BullRunConfig } from '../types/bullRun.ts'
import {
  BULL_RUN_DEFAULT_TARGET_SCORE,
  BULL_RUN_TARGET_SCORE_MAX,
  BULL_RUN_TARGET_SCORE_MIN,
} from './bullRunRules.ts'

export const DEFAULT_BULL_RUN_CONFIG: BullRunConfig = {
  targetScore: BULL_RUN_DEFAULT_TARGET_SCORE,
}

export const clampBullRunTargetScore = (value: number): number =>
  Math.min(BULL_RUN_TARGET_SCORE_MAX, Math.max(BULL_RUN_TARGET_SCORE_MIN, Math.round(value)))

export const getBullRunConfig = (config: BullRunConfig): BullRunConfig => {
  const startingScore =
    typeof config.startingScore === 'number' && Number.isFinite(config.startingScore)
      ? Math.max(0, Math.round(config.startingScore))
      : 0

  return {
    targetScore: clampBullRunTargetScore(config.targetScore),
    ...(startingScore > 0 ? { startingScore } : {}),
  }
}

export const parseBullRunTargetScore = (value: string | null): number => {
  if (value === null) {
    return BULL_RUN_DEFAULT_TARGET_SCORE
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed)) {
    return BULL_RUN_DEFAULT_TARGET_SCORE
  }

  return clampBullRunTargetScore(parsed)
}

export const parseBullRunConfigFromSearchParams = (params: URLSearchParams): BullRunConfig => ({
  targetScore: parseBullRunTargetScore(params.get('target')),
})

export const buildBullRunGamePath = (
  config: BullRunConfig,
  opponentParams?: URLSearchParams,
): string => {
  const normalized = getBullRunConfig(config)
  const params = new URLSearchParams(opponentParams)
  params.set('mode', GameModeId.BullRun)
  params.set('target', String(normalized.targetScore))

  return `/game?${params.toString()}`
}

export const getBullRunConfigLabel = (config: BullRunConfig): string =>
  String(getBullRunConfig(config).targetScore)
