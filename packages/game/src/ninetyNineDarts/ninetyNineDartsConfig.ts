import { NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import type { NinetyNineDartsConfig, NinetyNineDartsTarget } from '../types/ninetyNineDarts'
import { getNinetyNineDartsTargetLabel } from './ninetyNineDartsRules'

export const DEFAULT_NINETY_NINE_DARTS_CONFIG: NinetyNineDartsConfig = {
  target: { kind: NinetyNineDartsTargetKind.Number, value: 20 },
}

export const getNinetyNineDartsConfig = (config: NinetyNineDartsConfig): NinetyNineDartsConfig => ({
  target: normalizeNinetyNineDartsTarget(config.target),
})

export const normalizeNinetyNineDartsTarget = (
  target: NinetyNineDartsTarget,
): NinetyNineDartsTarget => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return { kind: NinetyNineDartsTargetKind.Bull }
  }

  const value = Math.min(20, Math.max(1, Math.round(target.value)))

  return { kind: NinetyNineDartsTargetKind.Number, value }
}

export const getNinetyNineDartsTargetParam = (target: NinetyNineDartsTarget): string => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return 'bull'
  }

  return String(target.value)
}

export const parseNinetyNineDartsTarget = (value: string | null): NinetyNineDartsTarget => {
  if (value === null || value === 'bull') {
    if (value === 'bull') {
      return { kind: NinetyNineDartsTargetKind.Bull }
    }

    return DEFAULT_NINETY_NINE_DARTS_CONFIG.target
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return DEFAULT_NINETY_NINE_DARTS_CONFIG.target
  }

  return { kind: NinetyNineDartsTargetKind.Number, value: parsed }
}

export const buildNinetyNineDartsGamePath = (config: NinetyNineDartsConfig): string => {
  const normalized = getNinetyNineDartsConfig(config)
  const params = new URLSearchParams({
    mode: '99-darts',
    target: getNinetyNineDartsTargetParam(normalized.target),
  })

  return `/game?${params.toString()}`
}

export const parseNinetyNineDartsConfigFromSearchParams = (
  params: URLSearchParams,
): NinetyNineDartsConfig => ({
  target: parseNinetyNineDartsTarget(params.get('target')),
})

export const getNinetyNineDartsConfigLabel = (config: NinetyNineDartsConfig): string =>
  getNinetyNineDartsTargetLabel(getNinetyNineDartsConfig(config).target)
