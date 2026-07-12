import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppGameController, CreateSessionParams } from '../lib/game/createSession'
import { createGameController, restoreGameController } from '../lib/game/createSession'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { getResumableSnapshot, persistControllerState } from '../lib/storage/visitPersistence'
import type { ActiveGameSnapshot } from '../types/activeGameSnapshot'
import type { DartThrow } from '../types/dart'
import type { Visit } from '../types/visit'
import type { ScoreCallerCallbacks } from './useVisitScoreCaller'

export interface UseGameOptions extends ScoreCallerCallbacks {
  routeKey?: string
  startFresh?: boolean
  shouldRestoreOnLoad?: boolean
  autoSaveCompletedSessions?: boolean
}

const notifyAfterVisitCommit = (
  current: AppGameController,
  next: AppGameController,
  visit: Visit,
  callbacks: ScoreCallerCallbacks,
): void => {
  callbacks.onVisitCommitted?.(visit, next)

  const legAdvanced =
    next.session.matchProgress?.currentLeg !== current.session.matchProgress?.currentLeg

  if (legAdvanced) {
    callbacks.onLegStarted?.(next)
    return
  }

  const turnAdvanced = next.turnIndex !== current.turnIndex

  if (turnAdvanced) {
    callbacks.onTurnStarted?.(next)
  }
}

export const useGame = (launchParams: CreateSessionParams, options: UseGameOptions = {}) => {
  const {
    routeKey = '',
    startFresh = false,
    shouldRestoreOnLoad = false,
    autoSaveCompletedSessions = false,
    onVisitCommitted,
    onTurnStarted,
    onLegStarted,
    onUndo,
  } = options

  const scoreCallerCallbacksRef = useRef<ScoreCallerCallbacks>({
    onVisitCommitted,
    onTurnStarted,
    onLegStarted,
  })

  scoreCallerCallbacksRef.current = {
    onVisitCommitted,
    onTurnStarted,
    onLegStarted,
  }

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

  const [controller, setController] = useState(() => createControllerForRoute())
  const routeSyncRef = useRef<{ routeKey: string; startFresh: boolean } | null>(null)

  useEffect(() => {
    const previous = routeSyncRef.current
    routeSyncRef.current = { routeKey, startFresh }

    if (startFresh) {
      clearActiveSnapshot()
      setController(createFreshController())
      return
    }

    if (previous === null) {
      return
    }

    if (previous.routeKey === routeKey && previous.startFresh === startFresh) {
      return
    }

    setController((current) => {
      if (current.isComplete) {
        return current
      }

      return createControllerForRoute()
    })
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
        const visitCommitted = next.session.visits.length > current.session.visits.length

        if (visitCommitted) {
          const visit = next.session.visits.at(-1)

          if (visit !== undefined) {
            notifyAfterVisitCommit(current, next, visit, scoreCallerCallbacksRef.current)
          }
        }

        persist(next)
        return next
      })
    },
    [persist],
  )

  const undoDart = useCallback(() => {
    setController((current) => {
      const next = current.undoDart()

      if (next === current) {
        return current
      }

      onUndo?.(current.session.id)

      persist(next)
      return next
    })
  }, [persist, onUndo])

  const finishMatch = useCallback(() => {
    setController((current) => {
      const next = current.finishMatch()
      const visitCommitted = next.session.visits.length > current.session.visits.length

      if (visitCommitted) {
        const visit = next.session.visits.at(-1)

        if (visit !== undefined) {
          notifyAfterVisitCommit(current, next, visit, scoreCallerCallbacksRef.current)
        }
      }

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
