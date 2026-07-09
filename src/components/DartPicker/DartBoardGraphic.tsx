import { DartMultiplier } from '../../types/dart'
import {
  CORNER_ZONES,
  DARTBOARD_CENTER,
  DARTBOARD_CENTER_RADIUS,
  DARTBOARD_COLORS,
  DARTBOARD_FONT_FAMILY,
  DARTBOARD_INNER_RADIUS,
  DARTBOARD_NUMBERS,
  DARTBOARD_OUTER_RADIUS,
  DARTBOARD_SEGMENT_ROTATION,
  DARTBOARD_VIEWBOX_SIZE,
  describeCornerPath,
  describeRingSegment,
  getCornerFill,
  getSegmentAngles,
  polarToCartesian,
  toBoardWorldPoint,
} from './dartboardLayout'
import type { CenterZone, CornerZone } from './dartboardLayout'

export interface DartBoardGraphicProps {
  hoveredNumber: number | null
  hoveredCorner: CornerZone | null
  activeCenterZone: CenterZone | null
  activeMultiplier: DartMultiplier.Double | DartMultiplier.Triple | null
}

const CORNER_LABELS: Record<CornerZone, { text: string; x: number; y: number }> = {
  bull: { text: 'BULL', x: 52, y: 52 },
  outerBull: { text: '25', x: 348, y: 52 },
  undo: { text: 'UNDO', x: 52, y: 348 },
  miss: { text: 'MISS', x: 348, y: 348 },
}

const describeCenterHalf = (sweep: 0 | 1): string =>
  `M ${DARTBOARD_CENTER} ${DARTBOARD_CENTER - DARTBOARD_CENTER_RADIUS} A ${DARTBOARD_CENTER_RADIUS} ${DARTBOARD_CENTER_RADIUS} 0 0 ${sweep} ${DARTBOARD_CENTER} ${DARTBOARD_CENTER + DARTBOARD_CENTER_RADIUS} Z`

const boardTextProps = {
  fill: DARTBOARD_COLORS.segmentText,
  fontFamily: DARTBOARD_FONT_FAMILY,
  fontWeight: 900,
  textAnchor: 'middle' as const,
  dominantBaseline: 'middle' as const,
  pointerEvents: 'none' as const,
}

export const DartBoardGraphic = ({
  hoveredNumber,
  hoveredCorner,
  activeCenterZone,
  activeMultiplier,
}: DartBoardGraphicProps) => (
  <>
    <rect
      width={DARTBOARD_VIEWBOX_SIZE}
      height={DARTBOARD_VIEWBOX_SIZE}
      fill={DARTBOARD_COLORS.background}
    />

    {CORNER_ZONES.map((corner) => {
      const path = describeCornerPath(corner)

      return (
        <g key={corner}>
          <path d={path} fill={getCornerFill(corner, hoveredCorner === corner)} />
          <path id={`corner-hit-${corner}`} d={path} fill="transparent" aria-hidden="true" />
        </g>
      )
    })}

    <g
      transform={`rotate(${DARTBOARD_SEGMENT_ROTATION}, ${DARTBOARD_CENTER}, ${DARTBOARD_CENTER})`}
    >
      {DARTBOARD_NUMBERS.map((number, index) => {
        const { start, end } = getSegmentAngles(index)
        const isHovered = hoveredCorner === null && hoveredNumber === number
        const fill = index % 2 === 0 ? DARTBOARD_COLORS.segmentDark : DARTBOARD_COLORS.segmentLight

        return (
          <path
            key={number}
            d={describeRingSegment(
              DARTBOARD_CENTER,
              DARTBOARD_CENTER,
              DARTBOARD_INNER_RADIUS,
              DARTBOARD_OUTER_RADIUS,
              start,
              end,
            )}
            fill={isHovered ? DARTBOARD_COLORS.segmentHover : fill}
            stroke={DARTBOARD_COLORS.ringStroke}
            strokeWidth={1}
          />
        )
      })}
    </g>

    {DARTBOARD_NUMBERS.map((number, index) => {
      const { mid } = getSegmentAngles(index)
      const localPosition = polarToCartesian(
        DARTBOARD_CENTER,
        DARTBOARD_CENTER,
        (DARTBOARD_INNER_RADIUS + DARTBOARD_OUTER_RADIUS) / 2,
        mid,
      )
      const labelPosition = toBoardWorldPoint(localPosition.x, localPosition.y)

      return (
        <text
          key={`label-${number}`}
          x={labelPosition.x}
          y={labelPosition.y}
          fontSize={18}
          fill={boardTextProps.fill}
          fontFamily={boardTextProps.fontFamily}
          fontWeight={boardTextProps.fontWeight}
          textAnchor={boardTextProps.textAnchor}
          dominantBaseline={boardTextProps.dominantBaseline}
          pointerEvents={boardTextProps.pointerEvents}
        >
          {number}
        </text>
      )
    })}

    <path
      d={describeCenterHalf(0)}
      fill={
        activeCenterZone === 'double' || activeMultiplier === DartMultiplier.Double
          ? DARTBOARD_COLORS.centerActive
          : DARTBOARD_COLORS.centerRed
      }
    />
    <path
      d={describeCenterHalf(1)}
      fill={
        activeCenterZone === 'triple' || activeMultiplier === DartMultiplier.Triple
          ? DARTBOARD_COLORS.centerActive
          : DARTBOARD_COLORS.centerRed
      }
    />
    <line
      x1={DARTBOARD_CENTER}
      y1={DARTBOARD_CENTER - DARTBOARD_CENTER_RADIUS}
      x2={DARTBOARD_CENTER}
      y2={DARTBOARD_CENTER + DARTBOARD_CENTER_RADIUS}
      stroke={DARTBOARD_COLORS.ringStroke}
      strokeWidth={2}
    />

    <text
      x={DARTBOARD_CENTER - 28}
      y={DARTBOARD_CENTER}
      fontSize={11}
      fill={boardTextProps.fill}
      fontFamily={boardTextProps.fontFamily}
      fontWeight={boardTextProps.fontWeight}
      textAnchor={boardTextProps.textAnchor}
      dominantBaseline={boardTextProps.dominantBaseline}
      pointerEvents={boardTextProps.pointerEvents}
    >
      DOUBLE
    </text>
    <text
      x={DARTBOARD_CENTER + 28}
      y={DARTBOARD_CENTER}
      fontSize={11}
      fill={boardTextProps.fill}
      fontFamily={boardTextProps.fontFamily}
      fontWeight={boardTextProps.fontWeight}
      textAnchor={boardTextProps.textAnchor}
      dominantBaseline={boardTextProps.dominantBaseline}
      pointerEvents={boardTextProps.pointerEvents}
    >
      TRIPLE
    </text>

    {CORNER_ZONES.map((corner) => {
      const label = CORNER_LABELS[corner]

      return (
        <text
          key={corner}
          x={label.x}
          y={label.y}
          fill={DARTBOARD_COLORS.cornerText}
          fontFamily={DARTBOARD_FONT_FAMILY}
          fontWeight={900}
          fontSize={corner === 'outerBull' ? 20 : 14}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
        >
          {label.text}
        </text>
      )
    })}
  </>
)
