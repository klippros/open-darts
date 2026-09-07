import type { GameController } from './GameController'

export const matchHasProgress = <State, Config>(
  controller: GameController<State, Config>,
): boolean =>
  !controller.isComplete &&
  (controller.pendingDarts.length > 0 || controller.session.visits.length > 0)
