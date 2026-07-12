import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { isX01Config } from '../game/gameConfigGuards'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'

const FIVE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FiveOhOne].startScore

export const isX01Session = (session: GameSession): boolean =>
  session.mode === GameModeId.X01 && isX01Config(session.mode, session.config)

export const filterFiveOhOneSessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter(
    (session) =>
      isX01Session(session) &&
      isX01Config(session.mode, session.config) &&
      session.config.startScore === FIVE_OH_ONE_START_SCORE,
  )

export const filterOtherX01Sessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter(
    (session) =>
      isX01Session(session) &&
      isX01Config(session.mode, session.config) &&
      session.config.startScore !== FIVE_OH_ONE_START_SCORE,
  )

export const filterCheckoutPracticeSessions = (
  sessions: GameSession[],
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown,
): GameSession[] => sessions.filter((session) => session.mode === mode)

export const filterBob27Sessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter((session) => session.mode === GameModeId.Bob27)

export const filterAroundTheClockSessions = (sessions: GameSession[]): GameSession[] =>
  sessions.filter((session) => session.mode === GameModeId.AroundTheClock)
