import type { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock.ts'
import { GameModeId } from '@open-darts/game/types/gameMode.ts'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig.ts'
import { getNinetyNineDartsConfig } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsConfig.ts'
import {
  isAroundTheClockConfig,
  isNinetyNineDartsConfig,
  isX01Config,
} from '@open-darts/game/game/gameConfigGuards.ts'
import { getNinetyNineDartsStatGroup } from './ninetyNineVisitStats.ts'
import type { NinetyNineDartsStatGroup } from './ninetyNineVisitStats.ts'
import { x01PresetConfigs, X01PresetId } from '@open-darts/game/x01/x01Presets.ts'

const FIVE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FiveOhOne].startScore
const ONE_SEVENTY_START_SCORE = x01PresetConfigs[X01PresetId.OneSeventy].startScore

export const isX01Session = (session: GameSession): boolean =>
  session.mode === GameModeId.X01 && isX01Config(session.mode, session.config)

export const filterAllX01Sessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter(isX01Session)

export const filterX01SessionsByStartScore = (
  sessions: GameSession[],
  startScore: number,
): GameSession[] =>
  sessions.filter(
    (session) =>
      isX01Session(session) &&
      isX01Config(session.mode, session.config) &&
      session.config.startScore === startScore,
  )

export const filterFiveOhOneSessions = (sessions: GameSession[]): GameSession[] =>
  filterX01SessionsByStartScore(sessions, FIVE_OH_ONE_START_SCORE)

export const filterOneSeventySessions = (sessions: GameSession[]): GameSession[] =>
  filterX01SessionsByStartScore(sessions, ONE_SEVENTY_START_SCORE)

export const filterCheckoutPracticeSessions = (
  sessions: GameSession[],
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown,
): GameSession[] => sessions.filter((session) => session.mode === mode)

export const filterBob27Sessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter((session) => session.mode === GameModeId.Bob27)

export const filterBullRunSessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter((session) => session.mode === GameModeId.BullRun)

export const filterAroundTheClockSessions = (
  sessions: GameSession[],
  aimMode?: AroundTheClockAimMode,
): GameSession[] =>
  sessions.filter((session) => {
    if (!isAroundTheClockConfig(session.mode, session.config)) {
      return false
    }

    if (aimMode === undefined) {
      return true
    }

    return getAroundTheClockConfig(session.config).aimMode === aimMode
  })

export const filterNinetyNineDartsSessions = (
  sessions: GameSession[],
  group?: NinetyNineDartsStatGroup,
): GameSession[] =>
  sessions.filter((session) => {
    if (!isNinetyNineDartsConfig(session.mode, session.config)) {
      return false
    }

    if (group === undefined) {
      return true
    }

    const { target } = getNinetyNineDartsConfig(session.config)

    return getNinetyNineDartsStatGroup(target) === group
  })
