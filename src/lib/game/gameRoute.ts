import { GameModeId } from '../../types/gameMode'
import type { CreateSessionParams } from '../game/createSession'
import { parseAroundTheClockConfigFromSearchParams } from '../aroundTheClock/aroundTheClockConfig'
import { buildPlayersFromOpponentSetup, parseOpponentSetup } from './opponentSetup'
import { createSoloHumanPlayer } from './playerFactory'
import { parseX01ConfigFromSearchParams } from '../x01/x01Presets'

export type PracticeGameMode =
  GameModeId.Bob27 | GameModeId.OneTwentyOne | GameModeId.AroundTheClock | GameModeId.TenUpOneDown

const PRACTICE_MODE_ROUTES: { mode: PracticeGameMode; param: string }[] = [
  { mode: GameModeId.Bob27, param: 'bob27' },
  { mode: GameModeId.OneTwentyOne, param: '121' },
  { mode: GameModeId.TenUpOneDown, param: '10-up-1-down' },
  { mode: GameModeId.AroundTheClock, param: 'around-the-clock' },
]

export const isPracticeGameMode = (mode: GameModeId): mode is PracticeGameMode =>
  PRACTICE_MODE_ROUTES.some((entry) => entry.mode === mode)

export const buildPracticeGamePath = (mode: PracticeGameMode): string => {
  const entry = PRACTICE_MODE_ROUTES.find((route) => route.mode === mode)

  return `/game?mode=${entry?.param ?? 'around-the-clock'}`
}

export const parseGameLaunchParams = (
  params: URLSearchParams,
  humanName?: string,
): CreateSessionParams => {
  const modeParam = params.get('mode')
  const practiceMode = PRACTICE_MODE_ROUTES.find((route) => route.param === modeParam)?.mode

  if (practiceMode === GameModeId.AroundTheClock) {
    return {
      mode: practiceMode,
      players: [createSoloHumanPlayer(humanName)],
      config: parseAroundTheClockConfigFromSearchParams(params),
    }
  }

  if (practiceMode !== undefined) {
    return { mode: practiceMode, players: [createSoloHumanPlayer(humanName)] }
  }

  const setup = parseOpponentSetup(params)

  return {
    mode: GameModeId.X01,
    config: parseX01ConfigFromSearchParams(params),
    players: buildPlayersFromOpponentSetup(setup, humanName),
    matchFormat: {
      legsToWin: setup.legsToWin,
      startingPlayerIndex: setup.startingPlayerIndex,
    },
  }
}
