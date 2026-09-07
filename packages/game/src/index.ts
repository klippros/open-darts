export const GAME_PACKAGE_NAME = '@open-darts/game'

export { GameController } from './game/GameController'
export { getEngine } from './game/gameRegistry'
export { createGameController, restoreGameController } from './game/createSession'
export type { AppGameController, CreateSessionParams } from './game/createSession'
export { correctVisit, CorrectVisitError } from './game/correctVisit'
export type { CorrectVisitResult, VisitCorrection } from './game/correctVisit'
export { replaySession } from './game/replaySession'
export type { ReplaySessionResult } from './game/replaySession'
export { resolveAsyncMatchResult } from './game/asyncMatchResult'
export type { AsyncMatchResult, AsyncMatchResultInput } from './game/asyncMatchResult'
export {
  parseActiveGameSnapshot,
  parseEngineState,
  parseGameSession,
  serializeActiveGameSnapshot,
  serializeEngineState,
  serializeGameSession,
} from './game/serializeGame'
