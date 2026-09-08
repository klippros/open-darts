import { Badge, Dialog, Stack, Text } from '@chakra-ui/react'
import {
  formatOnlineMatchDate,
  getOnlineMatchEndingLabel,
  getOnlineMatchModeLabel,
  getOnlineMatchSummaryTitle,
} from '../../lib/history/onlineHistorySummary'
import type { OnlineMatchHistoryRow } from '../../lib/matchServer/types'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { MatchSummaryTitle } from '../SessionSummary/MatchSummaryTitle'

export interface OnlineMatchSummaryDialogProps {
  open: boolean
  match: OnlineMatchHistoryRow | null
  viewerUserId: string
  resultSummary: string
  onClose: () => void
}

export const OnlineMatchSummaryDialog = ({
  open,
  match,
  viewerUserId,
  resultSummary,
  onClose,
}: OnlineMatchSummaryDialogProps) => {
  if (match === null) {
    return null
  }

  const title = getOnlineMatchSummaryTitle(match, viewerUserId)
  const modeLabel = getOnlineMatchModeLabel(match)
  const endingLabel = getOnlineMatchEndingLabel(match.endingKind)
  const legsLabel = `${match.legsToWin} leg${match.legsToWin === 1 ? '' : 's'}`

  return (
    <Dialog.Root
      open={open}
      placement="center"
      onOpenChange={(details) => {
        if (!details.open) {
          onClose()
        }
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          bg={darkDialogContentProps.bg}
          borderWidth={darkDialogContentProps.borderWidth}
          borderColor={darkDialogContentProps.borderColor}
          color={darkDialogContentProps.color}
          shadow={darkDialogContentProps.shadow}
          w="full"
          maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem', lg: '42rem' }}
        >
          <Dialog.Header>
            <Dialog.Title color="white">
              <MatchSummaryTitle title={title} />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={5}>
              <Stack direction="row" align="center" gap={2}>
                <Text
                  fontSize="sm"
                  color="whiteAlpha.700"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                >
                  {modeLabel}
                </Text>
                <Badge colorPalette="orange" variant="subtle">
                  Online
                </Badge>
              </Stack>

              <Stack gap={1}>
                <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
                  {resultSummary}
                </Text>
                <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55">
                  {endingLabel} · {legsLabel} · {formatOnlineMatchDate(match)}
                </Text>
              </Stack>
            </Stack>
          </Dialog.Body>
          <Dialog.CloseTrigger />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
