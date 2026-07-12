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
  onUndo?: (sessionId: string) => void
}

const announceLegStart = (controller: AppGameController): void => {
  const sessionId = controller.session.id
  const leg = controller.session.matchProgress?.currentLeg ?? 1

  announceCalloutOnce(legStartCalloutKey(sessionId, leg), buildLegStartCallout(controller))
  announceCalloutOnce(legRequireCalloutKey(sessionId, leg), buildVisitStartCallout(controller))
}

export const useVisitScoreCaller = (): ScoreCallerCallbacks => {
  const { scoreCallerEnabled } = useSettings()

  const handleUndo = useCallback((sessionId: string) => {
    cancelCallouts()

    if (sessionId !== '') {
      clearAnnouncedCallouts(sessionId)
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
        const endPhrase = buildVisitEndCallout(
          visit,
          controller.session,
          createVisitEndCalloutContext(controller.session, controller.isComplete),
        )
        announceCalloutOnce(visitEndCalloutKey(controller.session.id, visit.visitIndex), endPhrase)
      },
      onTurnStarted: (controller) => {
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
  const sessionContextRef = useRef<{ sessionId: string; hadVisits: boolean } | null>(null)

  useEffect(() => {
    if (!scoreCallerEnabled || !loadReady) {
      return
    }

    const { matchProgress, visits, id: sessionId } = controller.session

    if (sessionContextRef.current?.sessionId !== sessionId) {
      sessionContextRef.current = { sessionId, hadVisits: visits.length > 0 }
    } else if (visits.length > 0) {
      sessionContextRef.current.hadVisits = true
    }

    const hadVisits = sessionContextRef.current.hadVisits

    if (matchProgress === undefined || hadVisits || matchProgress.currentLeg !== 1) {
      return
    }

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
