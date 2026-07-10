import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from './accountContext'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import { isExplicitGameLaunch } from '../lib/routing/gameNavigation'
import { resolveGameLoadStrategy } from '../lib/routing/gameLoadStrategy'
import { buildGamePathFromSession } from '../lib/storage/sessionMatching'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { account } = useAccount()
  const [searchParams] = useSearchParams()
  const initialExplicitLaunch = useRef(isExplicitGameLaunch(location.state))
  const explicitLaunch = initialExplicitLaunch.current
  const launchParams = useMemo(
    () => parseGameLaunchParams(searchParams, account?.displayName),
    [searchParams, account?.displayName],
  )
  const [startFresh, setStartFresh] = useState(false)

  useEffect(() => {
    if (!isExplicitGameLaunch(location.state)) {
      return
    }

    void navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    )
  }, [location.pathname, location.search, location.state, navigate])

  const savedSnapshot = getResumableSnapshot()
  const routeKey = searchParams.toString()

  const resolveStrategy = useCallback(
    (activeSessionId?: string) =>
      resolveGameLoadStrategy({
        startFresh,
        explicitLaunch,
        savedSnapshot,
        launchParams,
        activeSessionId,
      }),
    [startFresh, explicitLaunch, savedSnapshot, launchParams],
  )

  const initialLoadStrategy = useMemo(() => resolveStrategy(), [resolveStrategy])

  const game = useGame(launchParams, {
    routeKey,
    startFresh,
    shouldRestoreOnLoad: initialLoadStrategy.shouldRestoreOnLoad,
    autoSaveCompletedSessions,
  })

  const { shouldShowResumePrompt } = useMemo(
    () => resolveStrategy(game.controller.session.id),
    [resolveStrategy, game.controller.session.id],
  )

  const startNewGame = () => {
    initialExplicitLaunch.current = false
    setStartFresh(true)
    game.discardSavedGame()
  }

  const resumeSavedGame = () => {
    const snapshot = getResumableSnapshot()

    if (snapshot === null) {
      return
    }

    initialExplicitLaunch.current = false
    setStartFresh(false)
    game.restoreFromSnapshot(snapshot)

    const targetPath = buildGamePathFromSession(snapshot.session)
    const currentPath = `/game?${searchParams.toString()}`

    if (targetPath !== currentPath) {
      void navigate(targetPath)
    }
  }

  const loadState: GameLoadState =
    shouldShowResumePrompt && savedSnapshot !== null
      ? { kind: 'conflict', savedSnapshot }
      : { kind: 'ready' }

  return {
    ...game,
    loadState,
    startNewGame,
    resumeSavedGame,
  }
}
