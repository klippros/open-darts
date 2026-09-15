import { Dialog, Text } from '@chakra-ui/react'
import type { StatTimeline, StatTimelinePoint } from '../../lib/analytics/statTimelines'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { StatTimelineChart } from './StatTimelineChart'

export interface StatTimelineDialogProps {
  open: boolean
  timeline: StatTimeline | null
  onClose: () => void
  onPointClick?: (point: StatTimelinePoint) => void
}

const formatPointUnit = (unit: StatTimeline['pointUnitLabel'], count: number): string => {
  if (unit === 'leg') {
    return count === 1 ? 'leg' : 'legs'
  }

  return count === 1 ? 'session' : 'sessions'
}

export const StatTimelineDialog = ({
  open,
  timeline,
  onClose,
  onPointClick,
}: StatTimelineDialogProps) => {
  if (timeline === null) {
    return null
  }

  const plottablePoints = timeline.points.filter((point) => point.value !== null)
  const unitLabel = formatPointUnit(timeline.pointUnitLabel, plottablePoints.length)

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
              {timeline.scopeLabel} · {plottablePoints.length} {unitLabel} with data · hover or
              click points for details
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {plottablePoints.length > 0 ? (
              <StatTimelineChart
                points={timeline.points}
                format={timeline.format}
                onPointClick={onPointClick}
              />
            ) : (
              <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55">
                No {formatPointUnit(timeline.pointUnitLabel, 2)} in this period have a value for
                this stat yet.
              </Text>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
