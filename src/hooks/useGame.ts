import { useCallback, useEffect, useState } from 'react'
import type { CreateSessionParams } from '../lib/game/createSession'
import { createGameController, restoreGameController } from '../lib/game/createSession'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { getResumableSnapshot, persistControllerState } from '../lib/storage/visitPersistence'
import type { ActiveGameSnapshot } from '../types/activeGameSnapshot'
import type { DartThrow } from '../types/dart'

export interface UseGameOptions {
  routeKey?: string
  startFresh?: boolean
  shouldRestoreOnLoad?: boolean
  autoSaveCompletedSessions?: boolean
}

export const useGame = (launchParams: CreateSessionParams, options: UseGameOptions = {}) => {
  const {
    routeKey = '',
    startFresh = false,
    shouldRestoreOnLoad = false,
    autoSaveCompletedSessions = false,
  } = options

  const createFreshController = useCallback(
    () => createGameController(launchParams),
    [launchParams],
  )

  const createControllerForRoute = useCallback(() => {
    if (shouldRestoreOnLoad) {
      const snapshot = getResumableSnapshot()

      if (snapshot !== null) {
        return restoreGameController(snapshot)
      }
    }

    return createFreshController()
  }, [shouldRestoreOnLoad, createFreshController])

  const [controller, setController] = useState(createControllerForRoute)

  useEffect(() => {
    if (startFresh) {
      clearActiveSnapshot()
      setController(createFreshController())
      return
    }

    setController(createControllerForRoute())
  }, [routeKey, startFresh, createFreshController, createControllerForRoute])

  const persist = useCallback(
    (nextController: typeof controller) => {
      persistControllerState(nextController, { autoSaveCompletedSessions })
    },
    [autoSaveCompletedSessions],
  )

  const recordDart = useCallback(
    (dart: DartThrow) => {
      setController((current) => {
        const next = current.recordDart(dart)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const undoDart = useCallback(() => {
    setController((current) => {
      const next = current.undoDart()
      persist(next)
      return next
    })
  }, [persist])

  const finishMatch = useCallback(() => {
    setController((current) => {
      const next = current.finishMatch()
      persist(next)
      return next
    })
  }, [persist])

  const restart = useCallback(() => {
    clearActiveSnapshot()
    setController(createFreshController())
  }, [createFreshController])

  const discardSavedGame = useCallback(() => {
    clearActiveSnapshot()
    setController(createFreshController())
  }, [createFreshController])

  const restoreFromSnapshot = useCallback((snapshot: ActiveGameSnapshot) => {
    setController(restoreGameController(snapshot))
  }, [])

  return {
    controller,
    recordDart,
    undoDart,
    finishMatch,
    restart,
    discardSavedGame,
    restoreFromSnapshot,
  }
}
