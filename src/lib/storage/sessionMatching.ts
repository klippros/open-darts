import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { CreateSessionParams } from '../game/createSession'
import { isX01Config } from '../game/gameConfigGuards'
import { getDefaultConfig } from '../game/gameModeDefinitions'
import { buildPracticeGamePath, isPracticeGameMode } from '../game/gameRoute'
import {
  appendOpponentSetupParams,
  getOpponentSetupFromSession,
  opponentSetupsMatch,
  playersMatchLaunchSetup,
} from '../game/opponentSetup'
import {
  buildX01GameSearchParams,
  findX01PresetId,
  x01ConfigsMatch,
} from '../x01/x01Presets'

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

  if (!configsMatch(session.mode, session.config, launchConfig)) {
    return false
  }

  const opponentSetup = getOpponentSetupFromSession(session)

  if (!playersMatchLaunchSetup(session.players, opponentSetup)) {
    return false
  }

  const [sessionHuman] = session.players
  const [launchHuman] = launchParams.players

  if (sessionHuman === undefined || launchHuman === undefined) {
    return session.players.length === launchParams.players.length
  }

  if (
    sessionHuman.kind !== launchHuman.kind ||
    sessionHuman.name !== launchHuman.name
  ) {
    return false
  }

  const launchSetup = getOpponentSetupFromSession({
    players: launchParams.players,
    matchProgress:
      launchParams.matchFormat === undefined
        ? undefined
        : {
            legsToWin: launchParams.matchFormat.legsToWin,
            startingPlayerIndex: launchParams.matchFormat.startingPlayerIndex,
            currentLeg: 1,
            legWins: Object.fromEntries(launchParams.players.map((player) => [player.id, 0])),
          },
  })

  return opponentSetupsMatch(opponentSetup, launchSetup)
}

export const buildGamePathFromSession = (session: GameSession): string => {
  if (isX01Config(session.mode, session.config)) {
    const opponentSetup = getOpponentSetupFromSession(session)
    const presetId = findX01PresetId(session.config)
    const params =
      presetId === null
        ? buildX01GameSearchParams(session.config)
        : new URLSearchParams({ preset: presetId })

    appendOpponentSetupParams(params, opponentSetup)

    return `/game?${params.toString()}`
  }

  if (isPracticeGameMode(session.mode)) {
    return buildPracticeGamePath(session.mode)
  }

  return buildPracticeGamePath(GameModeId.AroundTheClock)
}
