import { useCallback, useEffect, useRef, useState } from 'react'
import { listMyPendingOnlineMatchInvites } from '../lib/social/inviteApi'
import { createRequestGeneration } from '../lib/social/requestGeneration'
import type { PendingOnlineMatchInvite } from '../lib/social/types'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { supabaseClient } from '../lib/supabase/client'
import { AuthStatus } from '../types/auth'
import { useAuth } from './authContext'

export const usePendingOnlineMatchInvites = (): {
  invites: PendingOnlineMatchInvite[]
  refetch: () => Promise<void>
  removeInvite: (inviteId: string) => void
} => {
  const { authStatus, user } = useAuth()
  const [invites, setInvites] = useState<PendingOnlineMatchInvite[]>([])
  const userId = user?.id ?? null
  const requestGenerationRef = useRef(createRequestGeneration())

  const refetch = useCallback(async () => {
    const requestId = requestGenerationRef.current.next()

    if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated || userId === null) {
      setInvites([])
      return
    }

    try {
      const next = await listMyPendingOnlineMatchInvites()
      if (!requestGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setInvites(next)
    } catch {
      // Keep the last successful inbox snapshot for this account.
    }
  }, [authStatus, userId])

  const removeInvite = useCallback((inviteId: string) => {
    setInvites((current) => current.filter((invite) => invite.inviteId !== inviteId))
  }, [])

  useEffect(() => {
    requestGenerationRef.current.invalidate()
    setInvites([])
    void refetch()
  }, [refetch])

  useEffect(() => {
    const client = supabaseClient
    if (
      client === null ||
      !isOnlineMatchesEnabled ||
      authStatus !== AuthStatus.Authenticated ||
      userId === null
    ) {
      return undefined
    }

    const channel = client
      .channel(`online-match-invites-inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_match_invites',
          filter: `invitee_id=eq.${userId}`,
        },
        () => {
          void refetch()
        },
      )
      .subscribe(() => {
        void refetch()
      })

    const onFocus = () => {
      void refetch()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetch()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      void client.removeChannel(channel)
    }
  }, [authStatus, refetch, userId])

  return { invites, refetch, removeInvite }
}
