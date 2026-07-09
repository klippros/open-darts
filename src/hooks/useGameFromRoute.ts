import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import {
  buildGamePathFromSession,
  sessionMatchesLaunchParams,
} from '../lib/storage/sessionMatching'
import { getResumableSnapshot } from '../lib/storage/visitPersistence'
import type { ActiveGameSnapshot } from '../types/activeGameSnapshot'
import { useGame } from './useGame'

export type GameLoadState =
  { kind: 'ready' } | { kind: 'conflict'; savedSnapshot: ActiveGameSnapshot }

export interface UseGameFromRouteOptions {
  autoSaveCompletedSessions?: boolean
}

export const useGameFromRoute = (options: UseGameFromRouteOptions = {}) => {
  const { autoSaveCompletedSessions = false } = options
  const [searchParams] = useSearchParams()
  const launchParams = useMemo(() => parseGameLaunchParams(searchParams), [searchParams])
  const [startFresh, setStartFresh] = useState(false)

  const savedSnapshot = getResumableSnapshot()
  const hasConflict =
    !startFresh &&
    savedSnapshot !== null &&
    !sessionMatchesLaunchParams(savedSnapshot.session, launchParams)

  const shouldRestoreOnLoad = useMemo(() => {
    if (startFresh) {
      return false
    }

    const snapshot = getResumableSnapshot()

    return snapshot !== null && sessionMatchesLaunchParams(snapshot.session, launchParams)
  }, [startFresh, launchParams])

  const routeKey = useMemo(
    () => (startFresh ? `${searchParams.toString()}:fresh` : searchParams.toString()),
    [searchParams, startFresh],
  )

  const game = useGame(launchParams, { routeKey, shouldRestoreOnLoad, autoSaveCompletedSessions })

  const startNewGame = () => {
    setStartFresh(true)
    game.discardSavedGame()
  }

  const loadState: GameLoadState =
    hasConflict && savedSnapshot !== null ? { kind: 'conflict', savedSnapshot } : { kind: 'ready' }

  return {
    ...game,
    loadState,
    startNewGame,
    savedGamePath:
      hasConflict && savedSnapshot !== null
        ? buildGamePathFromSession(savedSnapshot.session)
        : null,
  }
}
