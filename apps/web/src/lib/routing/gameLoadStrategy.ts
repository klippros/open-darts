import type { CreateSessionParams } from '@open-darts/game/game/createSession'
import { sessionMatchesLaunchParams } from '../storage/sessionMatching'
import type { ActiveGameSnapshot } from '@open-darts/game/types/activeGameSnapshot'

export interface GameLoadStrategy {
  shouldRestoreOnLoad: boolean
  shouldShowResumePrompt: boolean
}

export const resolveGameLoadStrategy = ({
  startFresh,
  explicitLaunch,
  savedSnapshot,
  launchParams,
  activeSessionId,
}: {
  startFresh: boolean
  explicitLaunch: boolean
  savedSnapshot: ActiveGameSnapshot | null
  launchParams: CreateSessionParams
  activeSessionId?: string
}): GameLoadStrategy => {
  if (startFresh || savedSnapshot === null) {
    return { shouldRestoreOnLoad: false, shouldShowResumePrompt: false }
  }

  if (activeSessionId !== undefined && savedSnapshot.session.id === activeSessionId) {
    return { shouldRestoreOnLoad: false, shouldShowResumePrompt: false }
  }

  const settingsMatch = sessionMatchesLaunchParams(savedSnapshot.session, launchParams)

  if (explicitLaunch || !settingsMatch) {
    return { shouldRestoreOnLoad: false, shouldShowResumePrompt: true }
  }

  return { shouldRestoreOnLoad: true, shouldShowResumePrompt: false }
}
