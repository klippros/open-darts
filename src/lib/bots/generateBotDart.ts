import { GameModeId } from '../../types/gameMode'
import type { DartThrow } from '../../types/dart'
import { PlayerKind } from '../../types/player'
import type { AppGameController } from '../game/createSession'
import { isX01Config } from '../game/gameConfigGuards'
import type { X01State } from '../../types/x01'
import { generateX01BotDart } from './x01Bot'

export interface GenerateBotDartOptions {
  random?: () => number
}

const getX01State = (controller: AppGameController): X01State | null => {
  const { session } = controller

  if (session.mode !== GameModeId.X01 || !isX01Config(session.mode, session.config)) {
    return null
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine state matches active x01 session
  return controller.engineState as X01State
}

export const generateBotDart = (
  controller: AppGameController,
  options: GenerateBotDartOptions = {},
): DartThrow | null => {
  const { activePlayer, session, pendingDarts } = controller

  if (activePlayer.kind !== PlayerKind.Bot || activePlayer.botLevel === undefined) {
    return null
  }

  if (session.mode === GameModeId.X01) {
    const state = getX01State(controller)

    if (state === null) {
      return null
    }

    return generateX01BotDart({
      state,
      playerId: activePlayer.id,
      pendingDarts,
      skillLevel: activePlayer.botLevel,
      random: options.random,
    })
  }

  return null
}

export const isBotTurn = (controller: AppGameController): boolean =>
  !controller.isComplete && controller.activePlayer.kind === PlayerKind.Bot
