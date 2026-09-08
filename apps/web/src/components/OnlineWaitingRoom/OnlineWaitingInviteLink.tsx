import { Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { buildInviteAbsoluteUrl } from '../../lib/matchServer/api'

export interface OnlineWaitingInviteLinkProps {
  inviteToken: string
}

export const OnlineWaitingInviteLink = ({ inviteToken }: OnlineWaitingInviteLinkProps) => {
  const [copied, setCopied] = useState(false)
  const inviteUrl = buildInviteAbsoluteUrl(inviteToken)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Stack gap={3}>
      <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
        Invite link
      </Text>
      <Text
        color="whiteAlpha.700"
        fontSize="sm"
        lineHeight="1.55"
        wordBreak="break-all"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        bg="whiteAlpha.50"
        px={4}
        py={3}
      >
        {inviteUrl}
      </Text>
      <Button variant="cta" onClick={() => void handleCopy()}>
        {copied ? 'Copied' : 'Copy invite link'}
      </Button>
    </Stack>
  )
}
