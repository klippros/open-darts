import { useCallback, useEffect, useState } from 'react'
import { getMyInProgressOnlineMatch } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import type { InProgressOnlineMatchRow } from '../lib/matchServer/types'
import { useAuth } from './authContext'
import { AuthStatus } from '../types/auth'

export type InProgressOnlineMatchState =
  | { status: 'idle'; match: null }
  | { status: 'loading'; match: InProgressOnlineMatchRow | null }
  | { status: 'ready'; match: InProgressOnlineMatchRow | null }
  | { status: 'error'; match: null }

export type UseInProgressOnlineMatchResult = InProgressOnlineMatchState & {
  refetch: () => Promise<void>
}

export const useInProgressOnlineMatch = (): UseInProgressOnlineMatchResult => {
  const { authStatus } = useAuth()
  const [state, setState] = useState<InProgressOnlineMatchState>({ status: 'idle', match: null })

  const refetch = useCallback(async () => {
    if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated) {
      setState({ status: 'ready', match: null })
      return
    }

    setState((current) => ({
      status: 'loading',
      match: current.status === 'ready' ? current.match : null,
    }))

    try {
      const match = await getMyInProgressOnlineMatch()
      setState({ status: 'ready', match })
    } catch {
      setState({ status: 'error', match: null })
    }
  }, [authStatus])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { ...state, refetch }
}
