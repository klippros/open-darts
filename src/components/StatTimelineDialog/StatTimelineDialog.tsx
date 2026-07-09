import { Dialog, Text } from '@chakra-ui/react'
import type { StatTimeline } from '../../lib/analytics/statTimelines'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { StatTimelineChart } from './StatTimelineChart'

export interface StatTimelineDialogProps {
  open: boolean
  timeline: StatTimeline | null
  onClose: () => void
}

export const StatTimelineDialog = ({ open, timeline, onClose }: StatTimelineDialogProps) => {
  if (timeline === null) {
    return null
  }

  const plottablePoints = timeline.points.filter((point) => point.value !== null)

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
          maxW="720px"
        >
          <Dialog.Header>
            <Dialog.Title color="white">{timeline.metricLabel}</Dialog.Title>
            <Dialog.Description color="whiteAlpha.700">
              {timeline.scopeLabel} · {plottablePoints.length} match
              {plottablePoints.length === 1 ? '' : 'es'} with data · hover points for details
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {plottablePoints.length > 0 ? (
              <StatTimelineChart points={timeline.points} format={timeline.format} />
            ) : (
              <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55">
                No matches in this period have a value for this stat yet.
              </Text>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
