import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import {
  FollowApiError,
  followUser,
  isFollowingUser,
  unfollowUser,
} from '../../lib/social/followApi'
import { createRequestGeneration } from '../../lib/social/requestGeneration'

export interface ProfileFollowButtonProps {
  profileUserId: string
}

export const ProfileFollowButton = ({ profileUserId }: ProfileFollowButtonProps) => {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGenerationRef = useRef(createRequestGeneration())

  useEffect(() => {
    const requestId = requestGenerationRef.current.next()
    setLoading(true)
    setError(null)
    setBusy(false)

    const load = async () => {
      const next = await isFollowingUser(profileUserId)
      if (!requestGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setFollowing(next)
      setLoading(false)
    }

    void load()
  }, [profileUserId])

  const handleToggle = async () => {
    if (busy) {
      return
    }

    const requestId = requestGenerationRef.current.next()
    const previous = following
    setBusy(true)
    setError(null)
    setFollowing(!previous)

    try {
      if (previous) {
        await unfollowUser(profileUserId)
      } else {
        await followUser(profileUserId)
      }
    } catch (toggleError) {
      if (!requestGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setFollowing(previous)
      setError(
        toggleError instanceof FollowApiError
          ? toggleError.message
          : 'Unable to update follow status.',
      )
    } finally {
      if (requestGenerationRef.current.isCurrent(requestId)) {
        setBusy(false)
      }
    }
  }

  return (
    <Stack gap={2} align="start">
      <Button
        variant={following ? 'cancel' : 'emphasis'}
        disabled={loading || busy}
        onClick={() => {
          void handleToggle()
        }}
      >
        {loading ? '…' : following ? 'Following' : 'Follow'}
      </Button>
      {error !== null ? (
        <Text fontSize="sm" color="red.300">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
