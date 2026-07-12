import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AppGameController } from '../lib/game/createSession'
import {
  announceCalloutOnce,
  clearAnnouncedCallouts,
  legRequireCalloutKey,
  legStartCalloutKey,
  turnRequireCalloutKey,
  visitEndCalloutKey,
} from '../lib/scoreCaller/announceCallout'
import { buildLegStartCallout } from '../lib/scoreCaller/buildLegStartCallout'
import {
  buildVisitEndCallout,
  createVisitEndCalloutContext,
} from '../lib/scoreCaller/buildVisitEndCallout'
import { buildVisitStartCallout } from '../lib/scoreCaller/buildVisitStartCallout'
import { cancelCallouts } from '../lib/scoreCaller/speakCallout'
import type { Visit } from '../types/visit'
import { useSettings } from './settingsContext'

export interface ScoreCallerCallbacks {
  onVisitCommitted?: (visit: Visit, controller: AppGameController) => void
  onTurnStarted?: (controller: AppGameController) => void
  onLegStarted?: (controller: AppGameController) => void
  onUndo?: () => void
}

const announceLegStart = (controller: AppGameController): void => {
  const sessionId = controller.session.id
  const leg = controller.session.matchProgress?.currentLeg ?? 1

  announceCalloutOnce(legStartCalloutKey(sessionId, leg), buildLegStartCallout(controller))
  announceCalloutOnce(legRequireCalloutKey(sessionId, leg), buildVisitStartCallout(controller))
}

export const useVisitScoreCaller = (): ScoreCallerCallbacks => {
  const { scoreCallerEnabled } = useSettings()
  const sessionIdRef = useRef('')

  const handleUndo = useCallback(() => {
    cancelCallouts()

    if (sessionIdRef.current !== '') {
      clearAnnouncedCallouts(sessionIdRef.current)
    }
  }, [])

  return useMemo((): ScoreCallerCallbacks => {
    if (!scoreCallerEnabled) {
      return {
        onUndo: handleUndo,
      }
    }

    return {
      onVisitCommitted: (visit, controller) => {
        sessionIdRef.current = controller.session.id
        const endPhrase = buildVisitEndCallout(
          visit,
          controller.session,
          createVisitEndCalloutContext(controller.session, controller.isComplete),
        )
        announceCalloutOnce(visitEndCalloutKey(controller.session.id, visit.visitIndex), endPhrase)
      },
      onTurnStarted: (controller) => {
        sessionIdRef.current = controller.session.id
        const leg = controller.session.matchProgress?.currentLeg
        announceCalloutOnce(
          turnRequireCalloutKey(
            controller.session.id,
            leg,
            controller.turnIndex,
            controller.session.visits.length,
          ),
          buildVisitStartCallout(controller),
        )
      },
      onLegStarted: (controller) => {
        sessionIdRef.current = controller.session.id
        announceLegStart(controller)
      },
      onUndo: handleUndo,
    }
  }, [handleUndo, scoreCallerEnabled])
}

export const useScoreCallerInitialLeg = (
  controller: AppGameController,
  loadReady: boolean,
): void => {
  const { scoreCallerEnabled } = useSettings()
  const announcedSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    announcedSessionIdRef.current = null
  }, [controller.session.id])

  useEffect(() => {
    if (!scoreCallerEnabled || !loadReady) {
      return
    }

    const { matchProgress, visits, id: sessionId } = controller.session

    if (matchProgress === undefined || visits.length > 0) {
      return
    }

    if (announcedSessionIdRef.current === sessionId) {
      return
    }

    announcedSessionIdRef.current = sessionId
    announceLegStart(controller)
  }, [
    controller,
    controller.session.id,
    controller.session.matchProgress?.currentLeg,
    controller.session.visits.length,
    loadReady,
    scoreCallerEnabled,
  ])
}
