import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useBlocker, useLocation } from 'react-router-dom'
import { AbortMatchDialog } from '../components/AbortMatchDialog/AbortMatchDialog'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import type { MatchAbortContextValue } from '../hooks/useMatchAbort'
import { MatchAbortContext } from './matchAbortContext'

export interface MatchAbortState {
  hasProgress: boolean
  isComplete: boolean
}

export const MatchAbortProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const [matchState, setMatchState] = useState<MatchAbortState | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const isConfirmingAbortRef = useRef(false)

  const shouldBlockNavigation =
    !isConfirmingAbortRef.current &&
    matchState !== null &&
    matchState.hasProgress &&
    !matchState.isComplete

  useBeforeUnload(shouldBlockNavigation)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockNavigation && currentLocation.pathname !== nextLocation.pathname,
  )

  const cancelAbort = useCallback(() => {
    if (isConfirmingAbortRef.current) {
      return
    }

    setDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker])

  const confirmAbort = useCallback(() => {
    isConfirmingAbortRef.current = true
    setMatchState(null)
    setDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }, [blocker])

  useEffect(() => {
    isConfirmingAbortRef.current = false
  }, [location.pathname])

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setDialogOpen(true)
    }
  }, [blocker, blocker.state])

  const registerMatch = useCallback((state: MatchAbortState) => {
    setMatchState(state)
  }, [])

  const unregisterMatch = useCallback(() => {
    setMatchState(null)
  }, [])

  const contextValue = useMemo<MatchAbortContextValue>(
    () => ({
      registerMatch,
      unregisterMatch,
    }),
    [registerMatch, unregisterMatch],
  )

  return (
    <MatchAbortContext.Provider value={contextValue}>
      {children}
      <AbortMatchDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelAbort()
            return
          }

          setDialogOpen(true)
        }}
        onConfirm={confirmAbort}
      />
    </MatchAbortContext.Provider>
  )
}
