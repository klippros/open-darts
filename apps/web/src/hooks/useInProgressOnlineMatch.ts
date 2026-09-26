import { useCallback, useEffect, useRef, useState } from 'react'
import { getMyInProgressOnlineMatch } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import type { InProgressOnlineMatchRow } from '../lib/matchServer/types'
import { applyDismissedInProgressMatch } from './inProgressOnlineMatchDismiss'
import { useAuth } from './authContext'
import { AuthStatus } from '../types/auth'

export type InProgressOnlineMatchState =
  | { status: 'idle'; match: null }
  | { status: 'loading'; match: InProgressOnlineMatchRow | null }
  | { status: 'ready'; match: InProgressOnlineMatchRow | null }
  | { status: 'error'; match: null }

export type UseInProgressOnlineMatchResult = InProgressOnlineMatchState & {
  refetch: () => Promise<void>
  /**
   * Optimistically hide a lobby after cancel. Match-server index sync is async
   * (`waitUntil`), so an immediate refetch can still return the cancelled row.
   */
  dismissCancelledMatch: (matchId: string) => void
}

export const useInProgressOnlineMatch = (): UseInProgressOnlineMatchResult => {
  const { authStatus } = useAuth()
  const [state, setState] = useState<InProgressOnlineMatchState>({ status: 'idle', match: null })
  const dismissedMatchIdRef = useRef<string | null>(null)

  const refetch = useCallback(async () => {
    if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated) {
      dismissedMatchIdRef.current = null
      setState({ status: 'ready', match: null })
      return
    }

    setState((current) => {
      const retained =
        current.status === 'ready' || current.status === 'loading' ? current.match : null
      const { match } = applyDismissedInProgressMatch(retained, dismissedMatchIdRef.current)

      return { status: 'loading', match }
    })

    try {
      const fetched = await getMyInProgressOnlineMatch()
      const { match, keepDismissed } = applyDismissedInProgressMatch(
        fetched,
        dismissedMatchIdRef.current,
      )

      if (!keepDismissed) {
        dismissedMatchIdRef.current = null
      }

      setState({ status: 'ready', match })
    } catch {
      setState({ status: 'error', match: null })
    }
  }, [authStatus])

  const dismissCancelledMatch = useCallback(
    (matchId: string) => {
      dismissedMatchIdRef.current = matchId
      setState({ status: 'ready', match: null })
      // Give index sync a moment; dismissed id still filters a stale hit.
      window.setTimeout(() => {
        void refetch()
      }, 400)
    },
    [refetch],
  )

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { ...state, refetch, dismissCancelledMatch }
}
