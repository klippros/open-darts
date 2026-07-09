import type { PointerEvent } from 'react'
import { DartMultiplier } from '../../types/dart'
import {
  CORNER_ZONES,
  DARTBOARD_CENTER,
  DARTBOARD_CENTER_RADIUS,
  DARTBOARD_COLORS,
  DARTBOARD_FONT_FAMILY,
  DARTBOARD_INNER_RADIUS,
  DARTBOARD_NUMBERS,
  DARTBOARD_NUMBER_LABEL_RADIUS,
  DARTBOARD_OUTER_RADIUS,
  DARTBOARD_SEGMENT_ROTATION,
  DARTBOARD_TEXT_CLASS,
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
  inputDisabled?: boolean
  onCornerClick: (corner: CornerZone) => void
  onNumberClick: (number: number) => void
  onCenterPointerDown: (zone: CenterZone, event: PointerEvent<SVGPathElement>) => void
  onCornerHover: (corner: CornerZone | null) => void
  onNumberHover: (number: number | null) => void
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
  className: DARTBOARD_TEXT_CLASS,
  fill: DARTBOARD_COLORS.segmentText,
  fontFamily: DARTBOARD_FONT_FAMILY,
  fontWeight: 900,
  textAnchor: 'middle' as const,
  dominantBaseline: 'middle' as const,
  pointerEvents: 'none' as const,
}

interface BoardLabelProps {
  x: number
  y: number
  fontSize: number
  children: string | number
}

const BoardLabel = ({ x, y, fontSize, children }: BoardLabelProps) => (
  <text
    x={x}
    y={y}
    fontSize={fontSize}
    className={boardTextProps.className}
    fill={boardTextProps.fill}
    fontFamily={boardTextProps.fontFamily}
    fontWeight={boardTextProps.fontWeight}
    textAnchor={boardTextProps.textAnchor}
    dominantBaseline={boardTextProps.dominantBaseline}
    pointerEvents={boardTextProps.pointerEvents}
  >
    {children}
  </text>
)

export const DartBoardGraphic = ({
  hoveredNumber,
  hoveredCorner,
  activeCenterZone,
  activeMultiplier,
  inputDisabled = false,
  onCornerClick,
  onNumberClick,
  onCenterPointerDown,
  onCornerHover,
  onNumberHover,
}: DartBoardGraphicProps) => (
  <>
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
          <path
            d={path}
            fill="transparent"
            aria-hidden="true"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              onCornerClick(corner)
            }}
            onMouseEnter={() => {
              onCornerHover(corner)
            }}
            onMouseLeave={() => {
              onCornerHover(null)
            }}
          />
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
            style={{ cursor: inputDisabled ? 'default' : 'pointer' }}
            onClick={() => {
              onNumberClick(number)
            }}
            onMouseEnter={() => {
              onNumberHover(number)
            }}
            onMouseLeave={() => {
              onNumberHover(null)
            }}
          />
        )
      })}
    </g>

    {DARTBOARD_NUMBERS.map((number, index) => {
      const { mid } = getSegmentAngles(index)
      const localPosition = polarToCartesian(
        DARTBOARD_CENTER,
        DARTBOARD_CENTER,
        DARTBOARD_NUMBER_LABEL_RADIUS,
        mid,
      )
      const labelPosition = toBoardWorldPoint(localPosition.x, localPosition.y)

      return (
        <BoardLabel key={`label-${number}`} x={labelPosition.x} y={labelPosition.y} fontSize={20}>
          {number}
        </BoardLabel>
      )
    })}

    <path
      d={describeCenterHalf(0)}
      fill={
        activeCenterZone === 'double' || activeMultiplier === DartMultiplier.Double
          ? DARTBOARD_COLORS.centerActive
          : DARTBOARD_COLORS.centerRed
      }
      style={{ pointerEvents: 'none' }}
    />
    <path
      d={describeCenterHalf(1)}
      fill={
        activeCenterZone === 'triple' || activeMultiplier === DartMultiplier.Triple
          ? DARTBOARD_COLORS.centerActive
          : DARTBOARD_COLORS.centerRed
      }
      style={{ pointerEvents: 'none' }}
    />
    <line
      x1={DARTBOARD_CENTER}
      y1={DARTBOARD_CENTER - DARTBOARD_CENTER_RADIUS}
      x2={DARTBOARD_CENTER}
      y2={DARTBOARD_CENTER + DARTBOARD_CENTER_RADIUS}
      stroke={DARTBOARD_COLORS.ringStroke}
      strokeWidth={2}
      style={{ pointerEvents: 'none' }}
    />

    <path
      d={describeCenterHalf(0)}
      fill="transparent"
      aria-label="Double"
      style={{ cursor: inputDisabled ? 'default' : 'pointer' }}
      onPointerDown={(event) => {
        onCenterPointerDown('double', event)
      }}
    />
    <path
      d={describeCenterHalf(1)}
      fill="transparent"
      aria-label="Triple"
      style={{ cursor: inputDisabled ? 'default' : 'pointer' }}
      onPointerDown={(event) => {
        onCenterPointerDown('triple', event)
      }}
    />

    <BoardLabel x={DARTBOARD_CENTER - 28} y={DARTBOARD_CENTER} fontSize={16}>
      D
    </BoardLabel>
    <BoardLabel x={DARTBOARD_CENTER + 28} y={DARTBOARD_CENTER} fontSize={16}>
      T
    </BoardLabel>

    {CORNER_ZONES.map((corner) => {
      const label = CORNER_LABELS[corner]

      return (
        <BoardLabel
          key={corner}
          x={label.x}
          y={label.y}
          fontSize={corner === 'outerBull' ? 22 : 16}
        >
          {label.text}
        </BoardLabel>
      )
    })}
  </>
)
