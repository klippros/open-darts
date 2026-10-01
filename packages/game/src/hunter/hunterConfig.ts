import type { HunterConfig } from '../types/hunter'
import { GameModeId } from '../types/gameMode'

export const DEFAULT_HUNTER_CONFIG: HunterConfig = {
  startingPlayerIndex: 0,
}

export const getHunterConfig = (config: HunterConfig): HunterConfig => ({
  startingPlayerIndex: config.startingPlayerIndex,
})

export const parseHunterConfigFromSearchParams = (params: URLSearchParams): HunterConfig => {
  const raw = params.get('starter')
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10)
  const startingPlayerIndex = parsed === 1 ? 1 : 0

  return { startingPlayerIndex }
}

export const buildHunterSetupPath = (): string => '/game/hunter/setup'

export const buildHunterGamePath = (
  config: HunterConfig,
  opponentParams: URLSearchParams,
): string => {
  const params = new URLSearchParams(opponentParams)
  params.set('mode', GameModeId.Hunter)
  params.set('opponent', 'guest')
  params.set('legs', '1')
  params.set('starter', String(config.startingPlayerIndex))

  return `/game?${params.toString()}`
}
