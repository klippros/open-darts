import type { ActiveGameSnapshot } from '../../types/activeGameSnapshot'
import { GameStatus } from '../../types/gameMode'
import type { AppGameController } from '../game/createSession'
import { matchHasProgress } from '../game/matchProgress'
import {
  clearActiveSnapshot,
  loadActiveSnapshot,
  removeStoredSession,
  saveActiveSnapshot,
  saveStoredSession,
} from './gameStore'

export const createControllerSnapshot = (controller: AppGameController): ActiveGameSnapshot => ({
  session: controller.session,
  turnIndex: controller.turnIndex,
  pendingDarts: controller.pendingDarts,
  savedAt: new Date().toISOString(),
})

export const saveControllerSnapshot = (controller: AppGameController): void => {
  saveActiveSnapshot(createControllerSnapshot(controller))
}

export const finalizeCompletedSession = (controller: AppGameController): void => {
  saveStoredSession(controller.session)
  clearActiveSnapshot()
}

export interface PersistControllerOptions {
  autoSaveCompletedSessions?: boolean
}

export const persistControllerState = (
  controller: AppGameController,
  options: PersistControllerOptions = {},
): void => {
  const autoSaveCompletedSessions = options.autoSaveCompletedSessions ?? true

  if (controller.isComplete) {
    if (autoSaveCompletedSessions) {
      finalizeCompletedSession(controller)
    } else {
      clearActiveSnapshot()
    }
    return
  }

  removeStoredSession(controller.session.id)

  if (matchHasProgress(controller)) {
    saveControllerSnapshot(controller)
    return
  }

  clearActiveSnapshot()
}

export const getResumableSnapshot = (): ActiveGameSnapshot | null => {
  const snapshot = loadActiveSnapshot()

  if (snapshot === null || snapshot.session.status !== GameStatus.InProgress) {
    return null
  }

  return snapshot
}
