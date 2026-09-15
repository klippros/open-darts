import { GameModeId } from '@open-darts/game/types/gameMode'
import type { CreateSessionParams } from '@open-darts/game/game/createSession'
import { parseAroundTheClockConfigFromSearchParams } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { parseNinetyNineDartsConfigFromSearchParams } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsConfig'
import {
  buildPlayersFromOpponentSetup,
  getChallengeConfigFromSetup,
  parseOpponentSetup,
} from '@open-darts/game/game/opponentSetup'
import { createSoloHumanPlayer } from '@open-darts/game/game/playerFactory'
import { parseX01ConfigFromSearchParams } from '@open-darts/game/x01/x01Presets'

export type PracticeGameMode =
  | GameModeId.Bob27
  | GameModeId.OneTwentyOne
  | GameModeId.AroundTheClock
  | GameModeId.TenUpOneDown
  | GameModeId.NinetyNineDarts

const PRACTICE_MODE_ROUTES: { mode: PracticeGameMode; param: string }[] = [
  { mode: GameModeId.Bob27, param: 'bob27' },
  { mode: GameModeId.OneTwentyOne, param: '121' },
  { mode: GameModeId.TenUpOneDown, param: '10-up-1-down' },
  { mode: GameModeId.AroundTheClock, param: 'around-the-clock' },
  { mode: GameModeId.NinetyNineDarts, param: '99-darts' },
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

  if (practiceMode === GameModeId.NinetyNineDarts) {
    return {
      mode: practiceMode,
      players: [createSoloHumanPlayer(humanName)],
      config: parseNinetyNineDartsConfigFromSearchParams(params),
    }
  }

  if (practiceMode !== undefined) {
    return { mode: practiceMode, players: [createSoloHumanPlayer(humanName)] }
  }

  const x01Config = parseX01ConfigFromSearchParams(params)
  const setup = parseOpponentSetup(params, 2, x01Config.startScore)
  const challenge = getChallengeConfigFromSetup(setup, x01Config.startScore)

  return {
    mode: GameModeId.X01,
    config: x01Config,
    players: buildPlayersFromOpponentSetup(setup, humanName),
    matchFormat: {
      legsToWin: setup.legsToWin,
      startingPlayerIndex: setup.startingPlayerIndex,
      challenge,
    },
  }
}
