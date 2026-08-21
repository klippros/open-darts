import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { AroundTheClockConfig } from '../../types/aroundTheClock'

export const DEFAULT_AROUND_THE_CLOCK_CONFIG: Required<AroundTheClockConfig> = {
  finishOnBull: true,
  aimMode: AroundTheClockAimMode.Any,
}

export const getAroundTheClockConfig = (
  config: AroundTheClockConfig,
): Required<AroundTheClockConfig> => ({
  finishOnBull: config.finishOnBull,
  aimMode: config.aimMode ?? AroundTheClockAimMode.Any,
})

const AIM_MODE_LABELS: Record<AroundTheClockAimMode, string> = {
  [AroundTheClockAimMode.Singles]: 'Singles',
  [AroundTheClockAimMode.Doubles]: 'Doubles',
  [AroundTheClockAimMode.Trebles]: 'Trebles',
  [AroundTheClockAimMode.Any]: 'Any',
}

export const getAroundTheClockAimModeLabel = (aimMode: AroundTheClockAimMode): string =>
  AIM_MODE_LABELS[aimMode]

const AIM_MODE_PARAMS: Record<AroundTheClockAimMode, string> = {
  [AroundTheClockAimMode.Singles]: 'singles',
  [AroundTheClockAimMode.Doubles]: 'doubles',
  [AroundTheClockAimMode.Trebles]: 'trebles',
  [AroundTheClockAimMode.Any]: 'any',
}

const AIM_MODE_DESCRIPTIONS: Record<AroundTheClockAimMode, string> = {
  [AroundTheClockAimMode.Singles]: 'Hit the single segment on each number',
  [AroundTheClockAimMode.Doubles]: 'Hit the double on each number',
  [AroundTheClockAimMode.Trebles]: 'Hit the treble on each number',
  [AroundTheClockAimMode.Any]: 'Any segment on the number counts',
}

export const getAroundTheClockAimModeDescription = (aimMode: AroundTheClockAimMode): string =>
  AIM_MODE_DESCRIPTIONS[aimMode]

export const parseAroundTheClockAimMode = (value: string | null): AroundTheClockAimMode => {
  if (value === null) {
    return AroundTheClockAimMode.Any
  }

  for (const aimMode of Object.values(AroundTheClockAimMode)) {
    if (AIM_MODE_PARAMS[aimMode] === value) {
      return aimMode
    }
  }

  return AroundTheClockAimMode.Any
}

export const buildAroundTheClockGamePath = (config: AroundTheClockConfig): string => {
  const normalized = getAroundTheClockConfig(config)
  const params = new URLSearchParams({
    mode: 'around-the-clock',
    aim: AIM_MODE_PARAMS[normalized.aimMode],
  })

  if (!normalized.finishOnBull) {
    params.set('finishOnBull', 'false')
  }

  return `/game?${params.toString()}`
}

export const parseAroundTheClockConfigFromSearchParams = (
  params: URLSearchParams,
): AroundTheClockConfig => {
  const finishOnBullParam = params.get('finishOnBull')

  return {
    finishOnBull: finishOnBullParam !== 'false',
    aimMode: parseAroundTheClockAimMode(params.get('aim')),
  }
}
