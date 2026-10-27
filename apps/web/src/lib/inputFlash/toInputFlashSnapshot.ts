import { getAroundTheClockCurrentTargetIndex } from '@open-darts/game/aroundTheClock/buildAroundTheClockDarts'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { isAroundTheClockConfig, isHunterConfig } from '@open-darts/game/game/gameConfigGuards'
import type { AppGameController } from '@open-darts/game/game/createSession'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { getGameModePickerTargets } from '../game/getGameModePickerTargets'
import type { InputFlashTransitionSnapshot } from './buildInputFlashLabel'

/** Build a flash snapshot from the live game controller. */
export const toInputFlashSnapshot = (
  controller: AppGameController,
): InputFlashTransitionSnapshot => {
  const { mode, config, visits } = controller.session
  const pendingDarts = controller.pendingDarts
  const targets = getGameModePickerTargets(mode, controller.engineState, controller.activePlayerId)

  let aroundTheClockTargetIndex = targets.aroundTheClockTargetIndex

  if (
    mode === GameModeId.AroundTheClock &&
    isAroundTheClockConfig(mode, config) &&
    aroundTheClockTargetIndex !== undefined
  ) {
    aroundTheClockTargetIndex = getAroundTheClockCurrentTargetIndex(
      aroundTheClockTargetIndex,
      pendingDarts,
      getAroundTheClockConfig(config).aimMode,
    )
  }

  return {
    mode,
    config,
    pendingDarts,
    visits,
    ...(targets.hunterFieldNumber !== undefined && isHunterConfig(mode, config)
      ? { hunterFieldNumber: targets.hunterFieldNumber }
      : {}),
    ...(aroundTheClockTargetIndex !== undefined ? { aroundTheClockTargetIndex } : {}),
  }
}
