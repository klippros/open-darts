import { AroundTheClockAimMode, type AroundTheClockConfig } from '../../types/aroundTheClock'

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

export const getAroundTheClockAimModeLabel = (aimMode: AroundTheClockAimMode): string => {
  switch (aimMode) {
    case AroundTheClockAimMode.Singles:
      return 'Singles'
    case AroundTheClockAimMode.Doubles:
      return 'Doubles'
    case AroundTheClockAimMode.Trebles:
      return 'Trebles'
    case AroundTheClockAimMode.Any:
      return 'Any'
  }
}

const AIM_MODE_PARAMS: Record<AroundTheClockAimMode, string> = {
  [AroundTheClockAimMode.Singles]: 'singles',
  [AroundTheClockAimMode.Doubles]: 'doubles',
  [AroundTheClockAimMode.Trebles]: 'trebles',
  [AroundTheClockAimMode.Any]: 'any',
}

const AIM_MODE_FROM_PARAM = Object.fromEntries(
  Object.entries(AIM_MODE_PARAMS).map(([mode, param]) => [param, mode]),
) as Record<string, AroundTheClockAimMode>

export const getAroundTheClockAimModeDescription = (aimMode: AroundTheClockAimMode): string => {
  switch (aimMode) {
    case AroundTheClockAimMode.Singles:
      return 'Hit the single segment on each number'
    case AroundTheClockAimMode.Doubles:
      return 'Hit the double on each number'
    case AroundTheClockAimMode.Trebles:
      return 'Hit the treble on each number'
    case AroundTheClockAimMode.Any:
      return 'Any segment on the number counts'
  }
}

export const parseAroundTheClockAimMode = (value: string | null): AroundTheClockAimMode => {
  const aimMode = value === null ? undefined : AIM_MODE_FROM_PARAM[value]

  return aimMode ?? AroundTheClockAimMode.Any
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
    finishOnBull: finishOnBullParam === 'false' ? false : true,
    aimMode: parseAroundTheClockAimMode(params.get('aim')),
  }
}
