import { Box, Stack } from '@chakra-ui/react'
import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import {
  DARTBOARD_CENTER,
  DARTBOARD_FONT_FAMILY,
  DARTBOARD_NUMBERS,
  DARTBOARD_OUTER_RADIUS,
  DARTBOARD_SEGMENT_ROTATION,
  DARTBOARD_TEXT_CLASS,
  DARTBOARD_VIEWBOX_SIZE,
  describeRingSegment,
  getSegmentAngles,
  polarToCartesian,
  toBoardWorldPoint,
} from '../../DartPicker/dartboardLayout'
import type { AroundTheClockPerTargetStats } from '../../../lib/analytics/aroundTheClockStats'
import { formatCount, formatInteger } from '../../../lib/analytics/formatAnalytics'
import { isAroundTheClockBullTarget } from '../../../lib/aroundTheClock/aroundTheClockRules'
import {
  getHeatmapFillColor,
  getOverallAvgDartsPerHit,
  HEATMAP_BASE_SEGMENT_DARK,
  HEATMAP_BASE_SEGMENT_LIGHT,
  HEATMAP_BULL_BASE,
  HEATMAP_BULL_RADIUS,
  HEATMAP_LEGEND_STOPS,
  HEATMAP_SEGMENT_INNER_RADIUS,
  HEATMAP_SEGMENT_STROKE,
} from '../../../lib/aroundTheClock/aroundTheClockHeatmapColors'
import { AroundTheClockHeatmapLegend } from './AroundTheClockHeatmapLegend'
import { AroundTheClockHeatmapTooltip } from './AroundTheClockHeatmapTooltip'

export interface AroundTheClockHeatmapProps {
  targets: AroundTheClockPerTargetStats[]
}

interface CursorPosition {
  x: number
  y: number
}

const getBaseSegmentFill = (segmentIndex: number): string =>
  segmentIndex % 2 === 0 ? HEATMAP_BASE_SEGMENT_DARK : HEATMAP_BASE_SEGMENT_LIGHT

const HEATMAP_NUMBER_LABEL_RADIUS =
  HEATMAP_SEGMENT_INNER_RADIUS + (DARTBOARD_OUTER_RADIUS - HEATMAP_SEGMENT_INNER_RADIUS) * 0.65

const getTargetForSegmentIndex = (
  targets: AroundTheClockPerTargetStats[],
  segmentIndex: number,
): AroundTheClockPerTargetStats | undefined => {
  const boardNumber = DARTBOARD_NUMBERS[segmentIndex]

  if (boardNumber === undefined) {
    return undefined
  }

  return targets.find((target) => target.targetIndex === boardNumber - 1)
}

const getTooltipLines = (target: AroundTheClockPerTargetStats): string[] => {
  const lines = [`Target ${target.label}`]

  if (target.avgDartsPerHit !== null) {
    lines.push(`Avg darts: ${formatCount(target.avgDartsPerHit)}`)
  }

  if (target.bestDarts !== null) {
    lines.push(`Best: ${formatInteger(target.bestDarts)}`)
  }

  lines.push(`Attempts: ${target.attemptCount}`)

  return lines
}

const getCursorPosition = (
  svg: SVGSVGElement | null,
  event: PointerEvent,
): CursorPosition | null => {
  if (svg === null) {
    return null
  }

  const rect = svg.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

export const AroundTheClockHeatmap = ({ targets }: AroundTheClockHeatmapProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredTargetIndex, setHoveredTargetIndex] = useState<number | null>(null)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null)
  const targetsWithData = targets.filter((target) => target.attemptCount > 0)
  const overallAverage = useMemo(() => getOverallAvgDartsPerHit(targets), [targets])
  const bullTarget = targets.find((target) => isAroundTheClockBullTarget(target.targetIndex))
  const hoveredTarget =
    hoveredTargetIndex === null
      ? undefined
      : targets.find((target) => target.targetIndex === hoveredTargetIndex)

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    setCursorPosition(getCursorPosition(svgRef.current, event))
  }

  const clearHover = () => {
    setHoveredTargetIndex(null)
    setCursorPosition(null)
  }

  if (targetsWithData.length === 0) {
    return null
  }

  return (
    <Stack gap={3}>
      <Box px={{ base: 2, sm: 4 }} py={4}>
        <Box maxW="360px" mx="auto" position="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${DARTBOARD_VIEWBOX_SIZE} ${DARTBOARD_VIEWBOX_SIZE}`}
            width="100%"
            role="img"
            aria-label="Around the Clock target heatmap"
            onPointerMove={handlePointerMove}
            onPointerLeave={clearHover}
          >
            <defs>
              <style>
                {`
                  .${DARTBOARD_TEXT_CLASS} {
                    font-family: 'Archivo Black', sans-serif;
                    font-weight: 900;
                  }
                `}
              </style>
            </defs>

            <g
              transform={`rotate(${DARTBOARD_SEGMENT_ROTATION}, ${DARTBOARD_CENTER}, ${DARTBOARD_CENTER})`}
            >
              {DARTBOARD_NUMBERS.map((number, segmentIndex) => {
                const { start, end } = getSegmentAngles(segmentIndex)
                const targetStats = getTargetForSegmentIndex(targets, segmentIndex)
                const targetIndex = number - 1
                const fill =
                  targetStats === undefined
                    ? getBaseSegmentFill(segmentIndex)
                    : getHeatmapFillColor(
                        targetStats,
                        overallAverage,
                        getBaseSegmentFill(segmentIndex),
                      )

                return (
                  <path
                    key={number}
                    d={describeRingSegment(
                      DARTBOARD_CENTER,
                      DARTBOARD_CENTER,
                      HEATMAP_SEGMENT_INNER_RADIUS,
                      DARTBOARD_OUTER_RADIUS,
                      start,
                      end,
                    )}
                    fill={fill}
                    stroke={HEATMAP_SEGMENT_STROKE}
                    strokeWidth={1.5}
                    onPointerEnter={(event) => {
                      if (targetStats === undefined) {
                        return
                      }

                      setHoveredTargetIndex(targetIndex)
                      setCursorPosition(getCursorPosition(svgRef.current, event))
                    }}
                  />
                )
              })}
            </g>

            {bullTarget !== undefined && (
              <circle
                cx={DARTBOARD_CENTER}
                cy={DARTBOARD_CENTER}
                r={HEATMAP_BULL_RADIUS}
                fill={getHeatmapFillColor(bullTarget, overallAverage, HEATMAP_BULL_BASE)}
                stroke={HEATMAP_SEGMENT_STROKE}
                strokeWidth={2}
                onPointerEnter={(event) => {
                  setHoveredTargetIndex(bullTarget.targetIndex)
                  setCursorPosition(getCursorPosition(svgRef.current, event))
                }}
              />
            )}

            {DARTBOARD_NUMBERS.map((number, segmentIndex) => {
              const { mid } = getSegmentAngles(segmentIndex)
              const localPosition = polarToCartesian(
                DARTBOARD_CENTER,
                DARTBOARD_CENTER,
                HEATMAP_NUMBER_LABEL_RADIUS,
                mid,
              )
              const labelPosition = toBoardWorldPoint(localPosition.x, localPosition.y)

              return (
                <text
                  key={`label-${number}`}
                  x={labelPosition.x}
                  y={labelPosition.y}
                  fontSize={20}
                  className={DARTBOARD_TEXT_CLASS}
                  fill="white"
                  fontFamily={DARTBOARD_FONT_FAMILY}
                  fontWeight={900}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {number}
                </text>
              )
            })}

            {bullTarget !== undefined && (
              <text
                x={DARTBOARD_CENTER}
                y={DARTBOARD_CENTER}
                fontSize={16}
                className={DARTBOARD_TEXT_CLASS}
                fill="white"
                fontFamily={DARTBOARD_FONT_FAMILY}
                fontWeight={900}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                BULL
              </text>
            )}
          </svg>

          {hoveredTarget !== undefined && cursorPosition !== null && (
            <AroundTheClockHeatmapTooltip
              lines={getTooltipLines(hoveredTarget)}
              x={cursorPosition.x}
              y={cursorPosition.y}
            />
          )}
        </Box>
      </Box>

      <AroundTheClockHeatmapLegend stops={HEATMAP_LEGEND_STOPS} overallAverage={overallAverage} />
    </Stack>
  )
}
