import { AroundTheClockAimMode } from '../types/aroundTheClock'
import type { ClaimTheBoardConfig } from '../types/claimTheBoard'
import { GameModeId } from '../types/gameMode'

export const DEFAULT_CLAIM_THE_BOARD_CONFIG: ClaimTheBoardConfig = {
  aimMode: AroundTheClockAimMode.Any,
}

export const getClaimTheBoardConfig = (config: ClaimTheBoardConfig): ClaimTheBoardConfig => ({
  aimMode: config.aimMode,
})

const AIM_MODE_PARAMS: Record<AroundTheClockAimMode, string> = {
  [AroundTheClockAimMode.Singles]: 'singles',
  [AroundTheClockAimMode.Doubles]: 'doubles',
  [AroundTheClockAimMode.Trebles]: 'trebles',
  [AroundTheClockAimMode.Any]: 'any',
}

export const parseClaimTheBoardAimMode = (value: string | null): AroundTheClockAimMode => {
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

export const parseClaimTheBoardConfigFromSearchParams = (
  params: URLSearchParams,
): ClaimTheBoardConfig => ({
  aimMode: parseClaimTheBoardAimMode(params.get('aim')),
})

export const buildClaimTheBoardSetupPath = (config?: ClaimTheBoardConfig): string => {
  const aimMode = config?.aimMode ?? DEFAULT_CLAIM_THE_BOARD_CONFIG.aimMode
  const params = new URLSearchParams({
    aim: AIM_MODE_PARAMS[aimMode],
  })

  return `/game/claim-the-board/setup?${params.toString()}`
}

export const buildClaimTheBoardGamePath = (
  config: ClaimTheBoardConfig,
  opponentParams: URLSearchParams,
): string => {
  const params = new URLSearchParams(opponentParams)
  params.set('mode', GameModeId.ClaimTheBoard)
  params.set('aim', AIM_MODE_PARAMS[config.aimMode])
  params.set('opponent', 'guest')
  params.set('legs', '1')

  return `/game?${params.toString()}`
}
