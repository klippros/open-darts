import { gameModeDefinitions } from '@open-darts/game/game/gameModeDefinitions'
import {
  isAroundTheClockConfig,
  isBullRunConfig,
  isClaimTheBoardConfig,
  isNinetyNineDartsConfig,
  isX01Config,
} from '@open-darts/game/game/gameConfigGuards'
import { getBullRunConfigLabel } from '@open-darts/game/bullRun/bullRunConfig'
import {
  getAroundTheClockAimModeLabel,
  getAroundTheClockConfig,
} from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { getNinetyNineDartsConfigLabel } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsConfig'
import { formatX01StartScore } from '@open-darts/game/x01/x01Presets'
import type { GameSession } from '@open-darts/game/types/gameSession'

export const getSessionCompletedAt = (session: GameSession): string =>
  session.completedAt ?? session.startedAt

export const getSessionModeLabel = (session: GameSession): string => {
  if (isX01Config(session.mode, session.config)) {
    return formatX01StartScore(session.config)
  }

  if (isAroundTheClockConfig(session.mode, session.config)) {
    const { aimMode } = getAroundTheClockConfig(session.config)

    return `${gameModeDefinitions[session.mode].label} · ${getAroundTheClockAimModeLabel(aimMode)}`
  }

  if (isClaimTheBoardConfig(session.mode, session.config)) {
    return `${gameModeDefinitions[session.mode].label} · ${getAroundTheClockAimModeLabel(session.config.aimMode)}`
  }

  if (isNinetyNineDartsConfig(session.mode, session.config)) {
    return `${gameModeDefinitions[session.mode].label} · ${getNinetyNineDartsConfigLabel(session.config)}`
  }

  if (isBullRunConfig(session.mode, session.config)) {
    return `${gameModeDefinitions[session.mode].label} · ${getBullRunConfigLabel(session.config)}`
  }

  return gameModeDefinitions[session.mode].label
}
