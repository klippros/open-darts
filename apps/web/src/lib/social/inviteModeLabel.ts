import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import {
  isBullRunConfig,
  isClaimTheBoardConfig,
  isX01Config,
} from '@open-darts/game/game/gameConfigGuards'
import { formatX01StartScore } from '@open-darts/game/x01/x01Presets'
import { getAroundTheClockAimModeLabel } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { getBullRunConfigLabel } from '@open-darts/game/bullRun/bullRunConfig'
import { gameModeDefinitions } from '@open-darts/game/game/gameModeDefinitions'

export const getInviteModeLabel = (mode: string, config: GameConfig): string => {
  if (mode === (GameModeId.X01 as string) && isX01Config(GameModeId.X01, config)) {
    return formatX01StartScore(config)
  }

  if (
    mode === (GameModeId.ClaimTheBoard as string) &&
    isClaimTheBoardConfig(GameModeId.ClaimTheBoard, config)
  ) {
    return `${gameModeDefinitions[GameModeId.ClaimTheBoard].label} · ${getAroundTheClockAimModeLabel(config.aimMode)}`
  }

  if (mode === (GameModeId.Hunter as string)) {
    return gameModeDefinitions[GameModeId.Hunter].label
  }

  if (mode === (GameModeId.BullRun as string) && isBullRunConfig(GameModeId.BullRun, config)) {
    return `${gameModeDefinitions[GameModeId.BullRun].label} · ${getBullRunConfigLabel(config)}`
  }

  const knownMode = (Object.values(GameModeId) as string[]).includes(mode)
    ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mode string checked against GameModeId values
      (mode as GameModeId)
    : undefined

  return knownMode === undefined ? mode : (gameModeDefinitions[knownMode]?.label ?? mode)
}
