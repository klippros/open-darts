import { GameModeId } from '../../types/gameMode'
import type { CreateSessionParams } from '../game/createSession'
import { createSoloHumanPlayer } from '../game/playerFactory'
import { parseX01ConfigFromSearchParams } from '../x01/x01Presets'

export const buildPracticeGamePath = (
  mode:
    | GameModeId.Bob27
    | GameModeId.OneTwentyOne
    | GameModeId.AroundTheClock
    | GameModeId.TenUpOneDown,
): string => {
  if (mode === GameModeId.Bob27) {
    return '/game?mode=bob27'
  }

  if (mode === GameModeId.OneTwentyOne) {
    return '/game?mode=121'
  }

  if (mode === GameModeId.TenUpOneDown) {
    return '/game?mode=10-up-1-down'
  }

  return '/game?mode=around-the-clock'
}

export const parseGameLaunchParams = (params: URLSearchParams): CreateSessionParams => {
  const players = [createSoloHumanPlayer()]
  const mode = params.get('mode')

  if (mode === GameModeId.Bob27) {
    return { mode: GameModeId.Bob27, players }
  }

  if (mode === GameModeId.OneTwentyOne) {
    return { mode: GameModeId.OneTwentyOne, players }
  }

  if (mode === GameModeId.AroundTheClock) {
    return { mode: GameModeId.AroundTheClock, players }
  }

  if (mode === GameModeId.TenUpOneDown) {
    return { mode: GameModeId.TenUpOneDown, players }
  }

  return {
    mode: GameModeId.X01,
    config: parseX01ConfigFromSearchParams(params),
    players,
  }
}
