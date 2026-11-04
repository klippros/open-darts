import { useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { STARTING_PLAYER_INDEX_RANDOM } from '@open-darts/game/game/matchLegs'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'
import { useAuth } from '../../hooks/authContext'
import { useCreateOnlineMatch } from '../../hooks/useCreateOnlineMatch'
import { ONLINE_PLAY_QUERY_KEY, ONLINE_PLAY_QUERY_VALUE } from '../../lib/matchServer/onlineSetup'

export const useMatchSetupSession = (options: {
  initialPlayMode: string
  initialGuestName?: string
}) => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const [playMode, setPlayMode] = useState(options.initialPlayMode)
  const [guestName, setGuestName] = useState(options.initialGuestName ?? '')
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(STARTING_PLAYER_INDEX_RANDOM)
  const {
    createLobby,
    submitting,
    error,
    signInOpen,
    setSignInOpen,
    inProgressMatch,
    dismissCancelledMatch,
    isAuthLoading,
    authReady,
    isAuthenticated,
  } = useCreateOnlineMatch()

  const primaryPlayerLabel = resolveHumanPlayerName(profile?.displayName)
  const isOnline = playMode === 'online' && isAuthenticated
  const blockedByExistingMatch = isOnline && inProgressMatch !== null
  const opponentLabel = isOnline ? 'Opponent' : guestName.trim() || 'Guest'
  const signInReturnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.set(ONLINE_PLAY_QUERY_KEY, ONLINE_PLAY_QUERY_VALUE)
    return `${location.pathname}?${params.toString()}`
  }, [location.pathname, searchParams])

  const primaryLabel = isOnline
    ? submitting || isAuthLoading
      ? 'Creating…'
      : 'Create lobby'
    : 'Start game'
  const primaryDisabled = blockedByExistingMatch || (isOnline && (submitting || isAuthLoading))
  const canStart = !submitting && !(isOnline && isAuthLoading) && !blockedByExistingMatch

  return {
    playMode,
    setPlayMode,
    guestName,
    setGuestName,
    startingPlayerIndex,
    setStartingPlayerIndex,
    createLobby,
    error,
    signInOpen,
    setSignInOpen,
    inProgressMatch,
    dismissCancelledMatch,
    authReady,
    isAuthenticated,
    primaryPlayerLabel,
    isOnline,
    blockedByExistingMatch,
    opponentLabel,
    signInReturnTo,
    primaryLabel,
    primaryDisabled,
    canStart,
  }
}
