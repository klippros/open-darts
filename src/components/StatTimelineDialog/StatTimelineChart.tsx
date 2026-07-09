import { useState } from 'react'
import { Box } from '@chakra-ui/react'
import type { StatTimelineFormat, StatTimelinePoint } from '../../lib/analytics/statTimelines'
import {
  formatAverage,
  formatCount,
  formatInteger,
  formatPercent,
} from '../../lib/analytics/formatAnalytics'
import { formatSessionDate } from '../../lib/history/sessionSummary'

export interface StatTimelineChartProps {
  points: StatTimelinePoint[]
  format: StatTimelineFormat
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }
const TOOLTIP_WIDTH = 168
const TOOLTIP_HEIGHT = 62
const HIT_RADIUS = 12

const formatTimelineValue = (value: number, format: StatTimelineFormat): string => {
  switch (format) {
    case 'percent':
      return formatPercent(value)
    case 'integer':
      return formatInteger(value)
    case 'count':
      return formatCount(value)
    case 'average':
      return formatAverage(value)
  }

  return formatAverage(value)
}

const getPlotValues = (points: StatTimelinePoint[]): number[] =>
  points.flatMap((point) => (point.value === null ? [] : [point.value]))

const getTooltipPosition = (x: number, y: number): { tooltipX: number; tooltipY: number } => {
  const tooltipX = Math.min(
    Math.max(x - TOOLTIP_WIDTH / 2, PADDING.left),
    CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH,
  )
  const aboveY = y - HIT_RADIUS - 8 - TOOLTIP_HEIGHT
  const tooltipY = aboveY >= PADDING.top ? aboveY : y + HIT_RADIUS + 8

  return { tooltipX, tooltipY }
}

export const StatTimelineChart = ({ points, format }: StatTimelineChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const plotValues = getPlotValues(points)

  if (plotValues.length === 0) {
    return null
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const minValue = Math.min(...plotValues)
  const maxValue = Math.max(...plotValues)
  const valueRange = maxValue - minValue || 1

  const getX = (index: number): number => {
    if (points.length === 1) {
      return PADDING.left + plotWidth / 2
    }

    return PADDING.left + (index / (points.length - 1)) * plotWidth
  }

  const getY = (value: number): number =>
    PADDING.top + plotHeight - ((value - minValue) / valueRange) * plotHeight

  const lineSegments = points.flatMap((point, index) => {
    if (point.value === null || index === 0) {
      return []
    }

    const previousPoint = points[index - 1]

    if (previousPoint?.value === null || previousPoint === undefined) {
      return []
    }

    return [
      {
        key: `${previousPoint.sessionId}-${point.sessionId}`,
        x1: getX(index - 1),
        y1: getY(previousPoint.value),
        x2: getX(index),
        y2: getY(point.value),
      },
    ]
  })

  const hoveredPoint =
    hoveredIndex === null || points[hoveredIndex]?.value === null ? null : points[hoveredIndex]

  const tooltip =
    hoveredPoint !== null && hoveredPoint.value !== null && hoveredIndex !== null
      ? (() => {
          const x = getX(hoveredIndex)
          const y = getY(hoveredPoint.value)
          const { tooltipX, tooltipY } = getTooltipPosition(x, y)

          return (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={TOOLTIP_WIDTH}
                height={TOOLTIP_HEIGHT}
                rx={6}
                fill="rgba(0, 0, 0, 0.88)"
                stroke="rgba(255, 255, 255, 0.2)"
              />
              <text
                x={tooltipX + 10}
                y={tooltipY + 18}
                fill="rgba(255, 255, 255, 0.7)"
                fontSize="11"
              >
                {formatSessionDate(hoveredPoint.completedAt)}
              </text>
              <text x={tooltipX + 10} y={tooltipY + 34} fill="white" fontSize="12" fontWeight="600">
                {hoveredPoint.sessionLabel}
              </text>
              <text
                x={tooltipX + 10}
                y={tooltipY + 52}
                fill="#f6ad55"
                fontSize="13"
                fontWeight="700"
              >
                {formatTimelineValue(hoveredPoint.value, format)}
              </text>
            </g>
          )
        })()
      : null

  return (
    <Box w="full" overflowX="auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        aria-label="Stat timeline chart"
        onMouseLeave={() => {
          setHoveredIndex(null)
        }}
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={PADDING.left + plotWidth}
          y2={PADDING.top + plotHeight}
          stroke="rgba(255, 255, 255, 0.2)"
        />
        <text
          x={PADDING.left - 8}
          y={PADDING.top + 4}
          fill="rgba(255, 255, 255, 0.55)"
          fontSize="11"
          textAnchor="end"
        >
          {formatTimelineValue(maxValue, format)}
        </text>
        <text
          x={PADDING.left - 8}
          y={PADDING.top + plotHeight + 4}
          fill="rgba(255, 255, 255, 0.55)"
          fontSize="11"
          textAnchor="end"
        >
          {formatTimelineValue(minValue, format)}
        </text>
        {lineSegments.map((segment) => (
          <line
            key={segment.key}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke="#f6ad55"
            strokeWidth="2"
          />
        ))}
        {points.map((point, index) => {
          if (point.value === null) {
            return null
          }

          const x = getX(index)
          const y = getY(point.value)
          const isHovered = hoveredIndex === index

          return (
            <g key={point.sessionId}>
              <circle
                cx={x}
                cy={y}
                r={HIT_RADIUS}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHoveredIndex(index)
                }}
              />
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 5}
                fill={isHovered ? '#fbd38d' : '#f6ad55'}
                pointerEvents="none"
              />
            </g>
          )
        })}
        {tooltip}
      </svg>
    </Box>
  )
}
