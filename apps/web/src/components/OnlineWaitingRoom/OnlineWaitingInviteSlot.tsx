import { Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { buildInviteAbsoluteUrl } from '../../lib/matchServer/api'

export interface OnlineWaitingInviteSlotProps {
  inviteToken: string
}

export const OnlineWaitingInviteSlot = ({ inviteToken }: OnlineWaitingInviteSlotProps) => {
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
    <Stack
      direction="row"
      align="center"
      justify="space-between"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={4}
      py={3}
      gap={3}
    >
      <Stack gap={0.5} minW={0} flex="1">
        <Text color="white" fontWeight="semibold">
          Waiting for opponent
        </Text>
      </Stack>
      <Button variant="cancel" flexShrink={0} onClick={() => void handleCopy()}>
        {copied ? 'Copied' : 'Copy invite link'}
      </Button>
    </Stack>
  )
}
