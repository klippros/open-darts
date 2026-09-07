import type { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { getAroundTheClockConfig } from '../aroundTheClock/aroundTheClockConfig'
import { isAroundTheClockConfig, isX01Config } from '../game/gameConfigGuards'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'

const FIVE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FiveOhOne].startScore
const FOUR_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FourOhOne].startScore
const THREE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.ThreeOhOne].startScore

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

export const filterFourOhOneSessions = (sessions: GameSession[]): GameSession[] =>
  filterX01SessionsByStartScore(sessions, FOUR_OH_ONE_START_SCORE)

export const filterThreeOhOneSessions = (sessions: GameSession[]): GameSession[] =>
  filterX01SessionsByStartScore(sessions, THREE_OH_ONE_START_SCORE)

export const filterCheckoutPracticeSessions = (
  sessions: GameSession[],
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown,
): GameSession[] => sessions.filter((session) => session.mode === mode)

export const filterBob27Sessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter((session) => session.mode === GameModeId.Bob27)

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
