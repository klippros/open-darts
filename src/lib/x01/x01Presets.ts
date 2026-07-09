import type { X01Config } from '../../types/x01'

export enum X01PresetId {
  ThreeOhOne = '301',
  FourOhOne = '401',
  FiveOhOne = '501',
}

export const x01PresetConfigs: Record<X01PresetId, X01Config> = {
  [X01PresetId.ThreeOhOne]: {
    startScore: 301,
    doubleIn: false,
    doubleOut: true,
  },
  [X01PresetId.FourOhOne]: {
    startScore: 401,
    doubleIn: false,
    doubleOut: true,
  },
  [X01PresetId.FiveOhOne]: {
    startScore: 501,
    doubleIn: false,
    doubleOut: true,
  },
}

export const defaultX01Config = (): X01Config => ({ ...x01PresetConfigs[X01PresetId.FiveOhOne] })

export const getX01PresetConfig = (presetId: string): X01Config | null => {
  switch (presetId) {
    case '301':
      return { ...x01PresetConfigs[X01PresetId.ThreeOhOne] }
    case '401':
      return { ...x01PresetConfigs[X01PresetId.FourOhOne] }
    case '501':
      return { ...x01PresetConfigs[X01PresetId.FiveOhOne] }
    default:
      return null
  }
}

const parseBooleanFlag = (value: string | null, defaultValue: boolean): boolean => {
  if (value === null) {
    return defaultValue
  }

  if (value === '1' || value === 'true') {
    return true
  }

  if (value === '0' || value === 'false') {
    return false
  }

  return defaultValue
}

export const parseStartScore = (value: string | null, fallback = 501): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 999) {
    return fallback
  }

  return parsed
}

export const parseX01ConfigFromSearchParams = (params: URLSearchParams): X01Config => {
  const preset = params.get('preset')

  if (preset !== null) {
    const presetConfig = getX01PresetConfig(preset)

    if (presetConfig !== null) {
      return presetConfig
    }
  }

  const startScore = parseStartScore(params.get('start'))

  return {
    startScore,
    doubleIn: parseBooleanFlag(params.get('doubleIn'), false),
    doubleOut: parseBooleanFlag(params.get('doubleOut'), true),
  }
}

export const buildX01GameSearchParams = (config: X01Config): URLSearchParams => {
  const params = new URLSearchParams()
  params.set('start', String(config.startScore))

  if (config.doubleIn) {
    params.set('doubleIn', '1')
  }

  if (!config.doubleOut) {
    params.set('doubleOut', '0')
  }

  return params
}

export const buildX01PresetPath = (presetId: X01PresetId): string => `/game?preset=${presetId}`

export const buildX01CustomGamePath = (config: X01Config): string =>
  `/game?${buildX01GameSearchParams(config).toString()}`
