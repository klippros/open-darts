import { useEffect, useState } from 'react'
import { getMyInProgressOnlineMatch } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import type { InProgressOnlineMatchRow } from '../lib/matchServer/types'
import { useAuth } from './authContext'
import { AuthStatus } from '../types/auth'

export type InProgressOnlineMatchState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; match: InProgressOnlineMatchRow | null }
  | { status: 'error' }

export const useInProgressOnlineMatch = (): InProgressOnlineMatchState => {
  const { authStatus } = useAuth()
  const [state, setState] = useState<InProgressOnlineMatchState>({ status: 'idle' })

  useEffect(() => {
    if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated) {
      setState({ status: 'ready', match: null })
      return undefined
    }

    let cancelled = false
    setState({ status: 'loading' })

    const load = async () => {
      try {
        const match = await getMyInProgressOnlineMatch()
        if (!cancelled) {
          setState({ status: 'ready', match })
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error' })
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [authStatus])

  return state
}
