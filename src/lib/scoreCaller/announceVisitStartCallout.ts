import type { AppGameController } from '../game/createSession'
import type { GameSession } from '../../types/gameSession'
import { announceCalloutOnce, turnRequireCalloutKey } from './announceCallout'
import { buildVisitStartCallout } from './buildVisitStartCallout'

export const isSoloPracticeSession = (session: GameSession): boolean =>
  session.matchProgress === undefined

export const announceVisitStartCallout = (controller: AppGameController): void => {
  const { session } = controller

  announceCalloutOnce(
    turnRequireCalloutKey(
      session.id,
      session.matchProgress?.currentLeg,
      controller.turnIndex,
      session.visits.length,
    ),
    buildVisitStartCallout(controller),
  )
}
