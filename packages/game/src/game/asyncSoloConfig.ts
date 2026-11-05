import { getBullRunConfig } from '../bullRun/bullRunConfig'
import { isBullRunConfig, isX01Config } from './gameConfigGuards'
import type { BullRunConfig, BullRunState } from '../types/bullRun'
import type { GameConfig, GameModeId } from '../types/gameMode'
import type { X01Config, X01State } from '../types/x01'

/** Rebuild solo async play config from a shared stream start score. */
export const buildAsyncSoloConfig = (
  mode: GameModeId,
  config: GameConfig,
  startScore: number,
): GameConfig | null => {
  if (isX01Config(mode, config)) {
    return {
      ...config,
      startScore,
    } satisfies X01Config
  }

  if (isBullRunConfig(mode, config)) {
    const bullRunConfig = getBullRunConfig(config)

    return {
      targetScore: bullRunConfig.targetScore,
      ...(startScore > 0 ? { startingScore: startScore } : {}),
    } satisfies BullRunConfig
  }

  return null
}

/** Read the per-player progress used as the async stream start score. */
export const readAsyncStartScore = (
  mode: GameModeId,
  config: GameConfig,
  engineState: unknown,
  playerId: string,
): number | null => {
  if (isBullRunConfig(mode, config)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine state matches mode
    const bullRunState = engineState as BullRunState

    return bullRunState.players[playerId]?.score ?? 0
  }

  if (isX01Config(mode, config)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine state matches mode
    const x01State = engineState as X01State

    return x01State.players[playerId]?.remaining ?? config.startScore
  }

  return null
}
