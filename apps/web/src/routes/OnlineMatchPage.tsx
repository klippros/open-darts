import { Button, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { OnlineMatchPlayBoard } from '../components/OnlineMatchPlay/OnlineMatchPlayBoard'
import { OnlineWaitingRoom } from '../components/OnlineWaitingRoom/OnlineWaitingRoom'
import { ContentContainer } from '../components/ContentContainer'
import { MatchConnectionNotice } from '../components/MatchConnectionNotice/MatchConnectionNotice'
import { useAuth } from '../hooks/authContext'
import {
  OnlineMatchConnectionStatus,
  useOnlineMatchConnection,
} from '../hooks/useOnlineMatchConnection'
import { AuthStatus } from '../types/auth'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { MatchCommandName, MatchStatus } from '../lib/matchServer/types'
import { supabaseClient } from '../lib/supabase/client'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'

export const OnlineMatchPage = () => {
  const { id: matchId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { authStatus, user, profile } = useAuth()
  const connection = useOnlineMatchConnection(
    authStatus === AuthStatus.Authenticated ? matchId : undefined,
  )
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({})

  const playerIds = useMemo(
    () => connection.state?.players.map((player) => player.userId) ?? [],
    [connection.state?.players],
  )

  useEffect(() => {
    if (supabaseClient === null || playerIds.length === 0) {
      return undefined
    }

    const client = supabaseClient
    let cancelled = false

    const loadNames = async () => {
      const { data } = await client
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', playerIds)

      if (cancelled || data === null) {
        return
      }

      const next: Record<string, string> = {}
      for (const row of data) {
        if (
          typeof row === 'object' &&
          row !== null &&
          'user_id' in row &&
          typeof row.user_id === 'string'
        ) {
          const displayName =
            'display_name' in row && typeof row.display_name === 'string' ? row.display_name : null
          next[row.user_id] = resolveHumanPlayerName(displayName)
        }
      }
      setDisplayNames(next)
    }

    void loadNames()

    return () => {
      cancelled = true
    }
  }, [playerIds])

  const resolveDisplayName = useCallback(
    (userId: string) => {
      if (userId === user?.id) {
        return resolveHumanPlayerName(profile?.displayName)
      }

      return displayNames[userId] ?? 'Opponent'
    },
    [displayNames, profile?.displayName, user?.id],
  )

  if (!isOnlineMatchesEnabled) {
    return <Navigate to="/" replace />
  }

  if (authStatus === AuthStatus.Loading) {
    return (
      <ContentContainer py={10}>
        <Text color="whiteAlpha.700">Loading…</Text>
      </ContentContainer>
    )
  }

  if (authStatus !== AuthStatus.Authenticated || user === null || matchId === undefined) {
    return <Navigate to="/" replace />
  }

  const { state, status, error, sendCommand, reconnect } = connection

  if (state === null) {
    return (
      <ContentContainer py={10}>
        <Stack gap={4}>
          <Text color="whiteAlpha.700">
            {status === OnlineMatchConnectionStatus.Connecting ||
            status === OnlineMatchConnectionStatus.Reconnecting
              ? 'Connecting to match…'
              : 'Loading match…'}
          </Text>
          {error !== null && (
            <Text color="red.300" fontSize="sm">
              {error}
            </Text>
          )}
          <Button variant="cancel" onClick={reconnect}>
            Retry connection
          </Button>
        </Stack>
      </ContentContainer>
    )
  }

  if (state.status === MatchStatus.Waiting) {
    return (
      <>
        <MatchConnectionNotice
          error={error}
          showReconnecting={
            status === OnlineMatchConnectionStatus.Reconnecting ||
            status === OnlineMatchConnectionStatus.Connecting
          }
        />
        <OnlineWaitingRoom
          state={state}
          currentUserId={user.id}
          resolveDisplayName={resolveDisplayName}
          onBegin={() => {
            sendCommand({ name: MatchCommandName.BeginMatch })
          }}
          onKick={(targetUserId) => {
            sendCommand({ name: MatchCommandName.KickPlayer, targetUserId })
          }}
          onLeaveOrCancel={() => {
            sendCommand({
              name:
                state.creatorUserId === user.id
                  ? MatchCommandName.CancelWaiting
                  : MatchCommandName.LeaveWaiting,
            })
            void navigate('/')
          }}
        />
      </>
    )
  }

  if (state.status === MatchStatus.Cancelled) {
    return (
      <ContentContainer py={10}>
        <Stack gap={4}>
          <Text color="white">This match was cancelled.</Text>
          <Button
            variant="emphasis"
            onClick={() => {
              void navigate('/')
            }}
          >
            Back home
          </Button>
        </Stack>
      </ContentContainer>
    )
  }

  const opponentUserId = state.players.find((player) => player.userId !== user.id)?.userId

  return (
    <>
      <MatchConnectionNotice
        error={error}
        showReconnecting={
          state.status !== MatchStatus.Completed &&
          (status === OnlineMatchConnectionStatus.Reconnecting ||
            status === OnlineMatchConnectionStatus.Connecting)
        }
      />
      <OnlineMatchPlayBoard
        state={state}
        currentUserId={user.id}
        viewerDisplayName={profile?.displayName}
        opponentDisplayName={
          opponentUserId !== undefined ? resolveDisplayName(opponentUserId) : undefined
        }
        sendCommand={sendCommand}
      />
    </>
  )
}
