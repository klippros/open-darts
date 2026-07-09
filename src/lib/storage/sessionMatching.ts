import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { X01Config } from '../../types/x01'
import type { CreateSessionParams } from '../game/createSession'
import { isX01Config } from '../game/gameConfigGuards'
import { getDefaultConfig } from '../game/gameModeDefinitions'
import { buildPracticeGamePath } from '../game/gameRoute'
import {
  buildX01CustomGamePath,
  buildX01PresetPath,
  x01PresetConfigs,
  X01PresetId,
} from '../x01/x01Presets'

const x01ConfigsMatch = (left: X01Config, right: X01Config): boolean =>
  left.startScore === right.startScore &&
  left.doubleIn === right.doubleIn &&
  left.doubleOut === right.doubleOut

export const configsMatch = (mode: GameModeId, left: GameConfig, right: GameConfig): boolean => {
  if (isX01Config(mode, left) && isX01Config(mode, right)) {
    return x01ConfigsMatch(left, right)
  }

  return JSON.stringify(left) === JSON.stringify(right)
}

export const sessionMatchesLaunchParams = (
  session: GameSession,
  launchParams: CreateSessionParams,
): boolean => {
  if (session.mode !== launchParams.mode) {
    return false
  }

  const launchConfig = launchParams.config ?? getDefaultConfig(launchParams.mode)

  return configsMatch(session.mode, session.config, launchConfig)
}

const findX01PresetId = (config: X01Config): X01PresetId | null => {
  for (const presetId of Object.values(X01PresetId)) {
    if (x01ConfigsMatch(config, x01PresetConfigs[presetId])) {
      return presetId
    }
  }

  return null
}

export const buildGamePathFromSession = (session: GameSession): string => {
  if (isX01Config(session.mode, session.config)) {
    const presetId = findX01PresetId(session.config)

    if (presetId !== null) {
      return buildX01PresetPath(presetId)
    }

    return buildX01CustomGamePath(session.config)
  }

  if (session.mode === GameModeId.Bob27) {
    return buildPracticeGamePath(GameModeId.Bob27)
  }

  if (session.mode === GameModeId.OneTwentyOne) {
    return buildPracticeGamePath(GameModeId.OneTwentyOne)
  }

  if (session.mode === GameModeId.TenUpOneDown) {
    return buildPracticeGamePath(GameModeId.TenUpOneDown)
  }

  return buildPracticeGamePath(GameModeId.AroundTheClock)
}
