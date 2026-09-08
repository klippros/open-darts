import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SignInDialog } from '../components/SignInDialog/SignInDialog'
import { useAuth } from '../hooks/authContext'
import { useInProgressOnlineMatch } from '../hooks/useInProgressOnlineMatch'
import { AuthStatus } from '../types/auth'
import {
  buildInvitePath,
  buildMatchPath,
  joinMatch,
  lookupOnlineMatchInvite,
  MatchServerApiError,
} from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import type { OnlineMatchInvite } from '../lib/matchServer/types'

export const OnlineMatchJoinPage = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { authStatus, user } = useAuth()
  const inProgress = useInProgressOnlineMatch()
  const [invite, setInvite] = useState<OnlineMatchInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated || token === undefined) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const found = await lookupOnlineMatchInvite(token)

        if (cancelled) {
          return
        }

        setInvite(found)
        if (found === null) {
          setError('Invite not found or no longer waiting.')
        }
      } catch (lookupError) {
        if (cancelled) {
          return
        }

        setError(
          lookupError instanceof MatchServerApiError
            ? lookupError.message
            : 'Unable to look up invite',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [authStatus, token])

  if (!isOnlineMatchesEnabled) {
    return <Navigate to="/" replace />
  }

  if (authStatus === AuthStatus.Loading) {
    return (
      <SetupPageLayout>
        <Text color="whiteAlpha.700">Loading…</Text>
      </SetupPageLayout>
    )
  }

  if (token === undefined) {
    return <Navigate to="/" replace />
  }

  if (authStatus !== AuthStatus.Authenticated || user === null) {
    return (
      <SetupPageLayout>
        <Stack gap={8}>
          <SetupPageHeader
            title="Join online match"
            description="Sign in to accept this invite and play 501 against another player."
          />
          <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
            Online matches need a signed-in account. After you sign in, you will return here to
            join.
          </Text>
          <Stack direction="row" justify="space-between" gap={3}>
            <Button
              variant="cancel"
              onClick={() => {
                void navigate('/')
              }}
            >
              Back
            </Button>
            <Button
              variant="emphasis"
              onClick={() => {
                setSignInOpen(true)
              }}
            >
              Sign in to join
            </Button>
          </Stack>
        </Stack>
        <SignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          returnTo={buildInvitePath(token)}
          title="Sign in to join"
          description="Sign in with Google or a magic link. You will return to this invite after signing in."
        />
      </SetupPageLayout>
    )
  }

  if (
    inProgress.status === 'ready' &&
    inProgress.match !== null &&
    invite !== null &&
    inProgress.match.id !== invite.matchId
  ) {
    const currentMatchId = inProgress.match.id

    return (
      <SetupPageLayout>
        <Stack gap={8}>
          <SetupPageHeader
            title="Join online match"
            description="You already have an in-progress online match."
          />
          <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
            Finish or leave your current match before joining another lobby.
          </Text>
          <Stack direction="row" justify="space-between" gap={3}>
            <Button
              variant="cancel"
              onClick={() => {
                void navigate('/')
              }}
            >
              Back
            </Button>
            <Button
              variant="emphasis"
              onClick={() => {
                void navigate(buildMatchPath(currentMatchId))
              }}
            >
              Continue current match
            </Button>
          </Stack>
        </Stack>
      </SetupPageLayout>
    )
  }

  const handleJoin = async () => {
    if (invite === null) {
      return
    }

    setJoining(true)
    setError(null)

    try {
      const joined = await joinMatch(invite.matchId, token)
      void navigate(buildMatchPath(joined.matchId), { replace: true })
    } catch (joinError) {
      if (joinError instanceof MatchServerApiError && joinError.code === 'conflict') {
        setError('You already have an in-progress online match.')
      } else {
        setError(
          joinError instanceof MatchServerApiError ? joinError.message : 'Unable to join match',
        )
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Join online match"
          description="Accept an invite to play 501 against another signed-in player."
        />

        {loading && <Text color="whiteAlpha.700">Looking up invite…</Text>}

        {!loading && invite !== null && (
          <Stack
            gap={2}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            bg="whiteAlpha.50"
            px={4}
            py={4}
          >
            <Text color="white" fontWeight="semibold">
              {invite.creatorDisplayName}
            </Text>
            <Text color="whiteAlpha.700" fontSize="sm">
              501 · first to {invite.legsToWin} · {invite.playerCount}/2 players
            </Text>
          </Stack>
        )}

        {error !== null && (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        )}

        <Stack direction="row" justify="space-between" gap={3}>
          <Button
            variant="cancel"
            onClick={() => {
              void navigate('/')
            }}
          >
            Back
          </Button>
          <Button
            variant="emphasis"
            disabled={invite === null || joining || loading}
            onClick={() => {
              void handleJoin()
            }}
          >
            {joining ? 'Joining…' : 'Join match'}
          </Button>
        </Stack>
      </Stack>
    </SetupPageLayout>
  )
}
