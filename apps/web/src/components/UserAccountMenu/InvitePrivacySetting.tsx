import { Stack, Text } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/authContext'
import { ProfileApiError, setMyRequireMutualFollowForInvites } from '../../lib/profile/profileApi'
import { createRequestGeneration } from '../../lib/social/requestGeneration'
import { DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES } from '../../lib/social/invitePrivacyPreference'
import { SettingsSwitchRow } from '../SettingsMenu/SettingsSwitchRow'

export const InvitePrivacySetting = () => {
  const { profile, setRequireMutualFollowForInvites } = useAuth()
  const confirmed =
    profile?.requireMutualFollowForInvites ?? DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGenerationRef = useRef(createRequestGeneration())
  const profileUserId = profile?.userId ?? null

  useEffect(() => {
    requestGenerationRef.current.invalidate()
    setBusy(false)
    setError(null)
  }, [profileUserId])

  const handleCheckedChange = async (nextEnabled: boolean) => {
    if (busy || profile === null || nextEnabled === confirmed) {
      return
    }

    const requestId = requestGenerationRef.current.next()
    setBusy(true)
    setError(null)

    try {
      const saved = await setMyRequireMutualFollowForInvites(nextEnabled)
      if (!requestGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setRequireMutualFollowForInvites(saved)
    } catch (toggleError) {
      if (!requestGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setError(
        toggleError instanceof ProfileApiError
          ? toggleError.message
          : 'Unable to update invite privacy.',
      )
    } finally {
      if (requestGenerationRef.current.isCurrent(requestId)) {
        setBusy(false)
      }
    }
  }

  return (
    <Stack gap={2}>
      <SettingsSwitchRow
        label="Only allow invites from people I follow"
        description="Hosts must follow you, and you must follow them back, before they can invite you."
        checked={confirmed}
        disabled={busy || profile === null}
        onCheckedChange={(nextEnabled) => {
          void handleCheckedChange(nextEnabled)
        }}
      />
      {error !== null ? (
        <Text fontSize="xs" color="red.300">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
