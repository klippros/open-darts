export const GAME_PACKAGE_NAME = '@open-darts/game'

export { GameController } from './game/GameController'
export { getEngine } from './game/gameRegistry'
export { createGameController, restoreGameController } from './game/createSession'
export type { AppGameController, CreateSessionParams } from './game/createSession'
