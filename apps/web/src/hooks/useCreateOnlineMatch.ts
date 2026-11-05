import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OnlineMatchConfig, OnlineMatchMode } from '@open-darts/game/game/onlineMatchSetup'
import { useAuth } from './authContext'
import { useInProgressOnlineMatch } from './useInProgressOnlineMatch'
import { buildMatchPath, createMatch, MatchServerApiError } from '../lib/matchServer/api'
import type { InProgressOnlineMatchRow, MatchPlayerSlot } from '../lib/matchServer/types'
import { AuthStatus } from '../types/auth'

export interface CreateOnlineLobbyInput {
  mode: OnlineMatchMode
  legsToWin: number
  startingPlayerSlot: MatchPlayerSlot
  config: OnlineMatchConfig
}

export const useCreateOnlineMatch = () => {
  const navigate = useNavigate()
  const { authStatus, user } = useAuth()
  const inProgress = useInProgressOnlineMatch()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)

  const inProgressMatch: InProgressOnlineMatchRow | null =
    inProgress.status === 'ready' || inProgress.status === 'loading' ? inProgress.match : null
  const authReady = authStatus !== AuthStatus.Loading
  const isAuthLoading =
    !authReady ||
    (authStatus === AuthStatus.Authenticated &&
      (inProgress.status === 'idle' || inProgress.status === 'loading'))
  const isAuthenticated = authStatus === AuthStatus.Authenticated && user !== null

  const createLobby = async (input: CreateOnlineLobbyInput): Promise<boolean> => {
    if (isAuthLoading) {
      return false
    }

    if (!isAuthenticated) {
      setSignInOpen(true)
      return false
    }

    if (inProgressMatch !== null) {
      setError(
        'You already have an in-progress online match. Return to it or cancel it before creating another.',
      )
      return false
    }

    setSubmitting(true)
    setError(null)

    try {
      const created = await createMatch(input.legsToWin, input.startingPlayerSlot, {
        mode: input.mode,
        config: input.config,
      })
      void navigate(buildMatchPath(created.matchId), { replace: true })
      return true
    } catch (createError) {
      if (createError instanceof MatchServerApiError && createError.code === 'conflict') {
        setError(
          'You already have an in-progress online match. Return to it or cancel it before creating another.',
        )
        void inProgress.refetch()
      } else {
        const message =
          createError instanceof MatchServerApiError
            ? createError.message
            : 'Unable to create online match'
        setError(message)
      }
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return {
    createLobby,
    submitting,
    error,
    setError,
    signInOpen,
    setSignInOpen,
    inProgressMatch,
    dismissCancelledMatch: inProgress.dismissCancelledMatch,
    isAuthLoading,
    authReady,
    isAuthenticated,
  }
}
