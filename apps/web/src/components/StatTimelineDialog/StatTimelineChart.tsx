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
import {
  getLatestTrend,
  getTrailingAverages,
  getTrendSampleCount,
} from '../../lib/analytics/statTrend'

export interface StatTimelineChartProps {
  points: StatTimelinePoint[]
  format: StatTimelineFormat
  onPointClick?: (point: StatTimelinePoint) => void
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PADDING = { top: 16, right: 128, bottom: 28, left: 56 }
const TOOLTIP_WIDTH = 184
const TOOLTIP_HEIGHT = 80
const HIT_RADIUS = 14
const GRID_DIVISIONS = 4
const SERIES_COLOR = '#f6ad55'
const TREND_COLOR = '#90cdf4'
const GRID_STROKE = 'rgba(255, 255, 255, 0.12)'
const AXIS_LABEL_FILL = 'rgba(255, 255, 255, 0.55)'

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

const formatTrendLabel = (sampleCount: number, value: number, format: StatTimelineFormat): string =>
  `${formatTimelineValue(value, format)} (∅ last ${sampleCount})`

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

const getGridValues = (minValue: number, maxValue: number): number[] => {
  if (maxValue === minValue) {
    return [minValue]
  }

  return Array.from(
    { length: GRID_DIVISIONS + 1 },
    (_, index) => minValue + ((maxValue - minValue) * index) / GRID_DIVISIONS,
  )
}

export const StatTimelineChart = ({ points, format, onPointClick }: StatTimelineChartProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const plotValues = getPlotValues(points)
  const trailingAverages = getTrailingAverages(points)
  const latestTrend = getLatestTrend(trailingAverages)

  if (plotValues.length === 0) {
    return null
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const minValue = Math.min(...plotValues)
  const maxValue = Math.max(...plotValues)
  const valueRange = maxValue - minValue || 1
  const gridValues = getGridValues(minValue, maxValue)

  const getX = (index: number): number => {
    if (points.length === 1) {
      return PADDING.left + plotWidth / 2
    }

    return PADDING.left + (index / (points.length - 1)) * plotWidth
  }

  const getY = (value: number): number =>
    PADDING.top + plotHeight - ((value - minValue) / valueRange) * plotHeight

  const trendSegments = trailingAverages.flatMap((average, index) => {
    if (average === null || index === 0) {
      return []
    }

    const previousAverage = trailingAverages[index - 1]

    if (previousAverage === null || previousAverage === undefined) {
      return []
    }

    return [
      {
        key: `trend-${index}`,
        x1: getX(index - 1),
        y1: getY(previousAverage),
        x2: getX(index),
        y2: getY(average),
      },
    ]
  })

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

  const selectedPoint =
    selectedIndex === null || points[selectedIndex]?.value === null ? null : points[selectedIndex]
  const selectedTrend = selectedIndex === null ? null : (trailingAverages[selectedIndex] ?? null)

  const tooltip =
    selectedPoint !== null && selectedPoint.value !== null && selectedIndex !== null
      ? (() => {
          const x = getX(selectedIndex)
          const y = getY(selectedPoint.value)
          const { tooltipX, tooltipY } = getTooltipPosition(x, y)
          const canOpenSummary = onPointClick !== undefined

          return (
            <g
              role={canOpenSummary ? 'button' : undefined}
              tabIndex={canOpenSummary ? 0 : undefined}
              style={{ cursor: canOpenSummary ? 'pointer' : undefined }}
              onClick={(event) => {
                event.stopPropagation()
                onPointClick?.(selectedPoint)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onPointClick?.(selectedPoint)
                }
              }}
            >
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
                {formatSessionDate(selectedPoint.completedAt)}
              </text>
              <text x={tooltipX + 10} y={tooltipY + 34} fill="white" fontSize="12" fontWeight="600">
                {selectedPoint.sessionLabel}
              </text>
              <text
                x={tooltipX + 10}
                y={tooltipY + 52}
                fill={SERIES_COLOR}
                fontSize="13"
                fontWeight="700"
              >
                {formatTimelineValue(selectedPoint.value, format)}
              </text>
              {selectedTrend !== null ? (
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 70}
                  fill={TREND_COLOR}
                  fontSize="12"
                  fontWeight="600"
                >
                  {formatTrendLabel(
                    getTrendSampleCount(points, selectedIndex),
                    selectedTrend,
                    format,
                  )}
                </text>
              ) : null}
            </g>
          )
        })()
      : null

  const trendReferenceY = latestTrend === null ? null : getY(latestTrend.value)
  const trendLabel =
    latestTrend === null
      ? null
      : formatTrendLabel(latestTrend.sampleCount, latestTrend.value, format)

  return (
    <Box
      w="full"
      overflow="visible"
      minW={0}
      onMouseLeave={() => {
        // Touch browsers synthesize mouseleave after a tap; keep the selection until the next tap.
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          setSelectedIndex(null)
        }
      }}
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        style={{ overflow: 'visible', display: 'block', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Stat timeline chart"
      >
        {gridValues.map((value) => {
          const y = getY(value)

          return (
            <g key={`grid-${value}`}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + plotWidth}
                y2={y}
                stroke={GRID_STROKE}
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                fill={AXIS_LABEL_FILL}
                fontSize="11"
                textAnchor="end"
              >
                {formatTimelineValue(value, format)}
              </text>
            </g>
          )
        })}
        {trendReferenceY !== null && latestTrend !== null ? (
          <g>
            <line
              x1={PADDING.left}
              y1={trendReferenceY}
              x2={PADDING.left + plotWidth}
              y2={trendReferenceY}
              stroke={TREND_COLOR}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity={0.85}
            />
            <text
              x={PADDING.left + plotWidth + 6}
              y={trendReferenceY + 4}
              fill={TREND_COLOR}
              fontSize="11"
              fontWeight="600"
            >
              {trendLabel}
            </text>
          </g>
        ) : null}
        {trendSegments.map((segment) => (
          <line
            key={segment.key}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={TREND_COLOR}
            strokeWidth="2"
            opacity={0.9}
          />
        ))}
        {lineSegments.map((segment) => (
          <line
            key={segment.key}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={SERIES_COLOR}
            strokeWidth="2"
          />
        ))}
        {points.map((point, index) => {
          if (point.value === null) {
            return null
          }

          const x = getX(index)
          const y = getY(point.value)
          const isSelected = selectedIndex === index

          return (
            <g key={point.sessionId}>
              <circle
                cx={x}
                cy={y}
                r={HIT_RADIUS}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setSelectedIndex(index)
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedIndex((current) => (current === index ? null : index))
                }}
              />
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 7 : 5}
                fill={isSelected ? '#fbd38d' : SERIES_COLOR}
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
