import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isSupabaseConfigured, supabaseClient } from '../lib/supabase/client'
import {
  clearSyncedLocalSessionData,
  flushPendingSessionSync,
  retrySessionSync,
  startSessionSync,
  stopSessionSync,
} from '../lib/sync/sessionSync'
import { AuthStatus, SyncStatus } from '../types/auth'
import type { UserProfile } from '../types/auth'
import { AuthContext } from './authContext'

const getAuthRedirectUrl = (): string => {
  const baseUrlValue: unknown = import.meta.env.BASE_URL
  const baseUrl = typeof baseUrlValue === 'string' ? baseUrlValue : '/tools/open-darts/'

  return new URL(`${baseUrl}auth/callback`, window.location.origin).toString()
}

const getFallbackDisplayName = (user: User): string => {
  const fullName: unknown = user.user_metadata.full_name
  const name: unknown = user.user_metadata.name
  const metadataName = fullName ?? name

  if (typeof metadataName === 'string' && metadataName.trim() !== '') {
    return metadataName.trim()
  }

  const emailName = user.email?.split('@')[0]
  return emailName !== undefined && emailName !== '' ? emailName : 'You'
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? AuthStatus.Loading : AuthStatus.Anonymous,
  )
  const [syncStatus, setSyncStatus] = useState(SyncStatus.Idle)
  const currentUserId = useRef<string | null>(null)

  const applyUser = useCallback(async (nextUser: User | null) => {
    currentUserId.current = nextUser?.id ?? null
    setUser(nextUser)

    if (nextUser === null || supabaseClient === null) {
      stopSessionSync()
      setProfile(null)
      setAuthStatus(AuthStatus.Anonymous)
      setSyncStatus(SyncStatus.Idle)
      return
    }

    setAuthStatus(AuthStatus.Authenticated)
    const userId = nextUser.id
    const { data } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (currentUserId.current !== userId) {
      return
    }

    setProfile({
      userId,
      displayName:
        typeof data?.display_name === 'string'
          ? data.display_name
          : getFallbackDisplayName(nextUser),
    })
    await startSessionSync(supabaseClient, setSyncStatus)
  }, [])

  useEffect(() => {
    if (supabaseClient === null) {
      return undefined
    }

    const client = supabaseClient
    const initializeSession = async () => {
      const { data } = await client.auth.getSession()
      void applyUser(data.session?.user ?? null)
    }
    void initializeSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
      stopSessionSync()
    }
  }, [applyUser])

  useEffect(() => {
    const retry = () => {
      void retrySessionSync()
    }
    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        retry()
      }
    }

    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retryWhenVisible)

    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retryWhenVisible)
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    if (supabaseClient === null) {
      return 'Sign-in is not configured.'
    }

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl() },
    })

    return error?.message ?? null
  }, [])

  const signInWithEmail = useCallback(async (email: string): Promise<string | null> => {
    if (supabaseClient === null) {
      return 'Sign-in is not configured.'
    }

    const normalizedEmail = email.trim()

    if (normalizedEmail === '' || !normalizedEmail.includes('@')) {
      return 'Enter a valid email address.'
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    })

    return error?.message ?? null
  }, [])

  const signOut = useCallback(async (): Promise<string | null> => {
    if (supabaseClient === null) {
      return null
    }

    await flushPendingSessionSync()
    clearSyncedLocalSessionData()
    stopSessionSync()
    const { error } = await supabaseClient.auth.signOut()
    return error?.message ?? null
  }, [])

  const clearSyncedSessions = useCallback(async (): Promise<string | null> => {
    if (supabaseClient === null || user === null) {
      return null
    }

    await retrySessionSync()
    const { error } = await supabaseClient.from('game_sessions').delete().eq('user_id', user.id)

    return error?.message ?? null
  }, [user])

  const value = useMemo(
    () => ({
      user,
      profile,
      authStatus,
      syncStatus,
      isConfigured: isSupabaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      clearSyncedSessions,
    }),
    [
      user,
      profile,
      authStatus,
      syncStatus,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      clearSyncedSessions,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
