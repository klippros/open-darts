export const DARTBOARD_VIEWBOX_SIZE = 400
export const DARTBOARD_CENTER = DARTBOARD_VIEWBOX_SIZE / 2
export const DARTBOARD_OUTER_RADIUS = 168
export const DARTBOARD_INNER_RADIUS = 88
export const DARTBOARD_CENTER_RADIUS = 78
export const DARTBOARD_CORNER_INNER_RADIUS = DARTBOARD_OUTER_RADIUS + 10
export const DARTBOARD_SEGMENT_ROTATION = -9
export const DARTBOARD_FONT_FAMILY = 'Archivo Black, sans-serif'

export const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const

export const SEGMENT_COUNT = DARTBOARD_NUMBERS.length
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT

export const DARTBOARD_COLORS = {
  segmentDark: '#1a1a1a',
  segmentLight: '#3a3634',
  segmentHover: '#5a4f4f',
  centerRed: '#4a1f28',
  centerActive: '#6b2a38',
  cornerBull: '#4a1f28',
  cornerBullHover: '#6b2a38',
  cornerOuterBull: '#1f3d2a',
  cornerOuterBullHover: '#2d5a3c',
  cornerAction: '#2a2a2a',
  cornerActionHover: '#3d3d3d',
  segmentText: '#f5f5f5',
  cornerText: '#f5f5f5',
  ringStroke: '#111111',
  background: '#151515',
} as const

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

const rotatePointAroundCenter = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  degrees: number,
): { x: number; y: number } => {
  const radians = toRadians(degrees)
  const dx = x - centerX
  const dy = y - centerY
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}

export const toBoardLocalPoint = (x: number, y: number): { x: number; y: number } =>
  rotatePointAroundCenter(x, y, DARTBOARD_CENTER, DARTBOARD_CENTER, -DARTBOARD_SEGMENT_ROTATION)

export const toBoardWorldPoint = (x: number, y: number): { x: number; y: number } =>
  rotatePointAroundCenter(x, y, DARTBOARD_CENTER, DARTBOARD_CENTER, DARTBOARD_SEGMENT_ROTATION)

export const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): { x: number; y: number } => {
  const angleRadians = toRadians(angleDegrees - 90)

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  }
}

export const describeRingSegment = (
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string => {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

const describeMinorArc = (
  center: number,
  radius: number,
  fromAngle: number,
  toAngle: number,
): string => {
  const to = polarToCartesian(center, center, radius, toAngle)
  const clockwiseSpan = (toAngle - fromAngle + 360) % 360
  const counterClockwiseSpan = (fromAngle - toAngle + 360) % 360
  const useClockwise = clockwiseSpan <= counterClockwiseSpan
  const span = useClockwise ? clockwiseSpan : counterClockwiseSpan
  const largeArc = span <= 180 ? 0 : 1
  const sweep = useClockwise ? 1 : 0

  return `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${to.x} ${to.y}`
}

export const describeCornerPath = (
  corner: CornerZone,
  size: number = DARTBOARD_VIEWBOX_SIZE,
  center: number = DARTBOARD_CENTER,
  innerRadius: number = DARTBOARD_CORNER_INNER_RADIUS,
): string => {
  const top = polarToCartesian(center, center, innerRadius, 0)
  const right = polarToCartesian(center, center, innerRadius, 90)
  const bottom = polarToCartesian(center, center, innerRadius, 180)
  const left = polarToCartesian(center, center, innerRadius, 270)

  switch (corner) {
    case 'bull':
      return [
        'M 0 0',
        `L ${top.x} 0`,
        `L ${top.x} ${top.y}`,
        describeMinorArc(center, innerRadius, 0, 270),
        `L 0 ${left.y}`,
        'Z',
      ].join(' ')
    case 'outerBull':
      return [
        `M ${size} 0`,
        `L ${top.x} 0`,
        `L ${top.x} ${top.y}`,
        describeMinorArc(center, innerRadius, 0, 90),
        `L ${size} ${right.y}`,
        'Z',
      ].join(' ')
    case 'undo':
      return [
        `M 0 ${size}`,
        `L ${bottom.x} ${size}`,
        `L ${bottom.x} ${bottom.y}`,
        describeMinorArc(center, innerRadius, 180, 270),
        `L 0 ${left.y}`,
        'Z',
      ].join(' ')
    case 'miss':
      return [
        `M ${size} ${size}`,
        `L ${bottom.x} ${size}`,
        `L ${bottom.x} ${bottom.y}`,
        describeMinorArc(center, innerRadius, 180, 90),
        `L ${size} ${right.y}`,
        'Z',
      ].join(' ')
    default: {
      const unreachable: never = corner
      return unreachable
    }
  }
}

export const getSegmentAngles = (index: number): { start: number; end: number; mid: number } => {
  const start = index * SEGMENT_ANGLE
  const end = start + SEGMENT_ANGLE

  return {
    start,
    end,
    mid: start + SEGMENT_ANGLE / 2,
  }
}

export const getNumberAtPoint = (
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  x: number,
  y: number,
): number | null => {
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.hypot(dx, dy)

  if (distance < innerRadius || distance > outerRadius) {
    return null
  }

  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360
  const index = Math.floor(angle / SEGMENT_ANGLE) % SEGMENT_COUNT

  return DARTBOARD_NUMBERS[index] ?? null
}

export type CenterZone = 'double' | 'triple'

export const getCenterZoneAtPoint = (
  centerX: number,
  centerY: number,
  radius: number,
  x: number,
  y: number,
): CenterZone | null => {
  const dx = x - centerX
  const dy = y - centerY

  if (Math.hypot(dx, dy) > radius) {
    return null
  }

  return dx < 0 ? 'double' : 'triple'
}

export type CornerZone = 'bull' | 'outerBull' | 'undo' | 'miss'

export const CORNER_ZONES: CornerZone[] = ['bull', 'outerBull', 'undo', 'miss']

export const getCornerZoneFromPaths = (
  svg: SVGSVGElement,
  x: number,
  y: number,
): CornerZone | null => {
  const point = svg.createSVGPoint()
  point.x = x
  point.y = y

  for (const corner of CORNER_ZONES) {
    const element = svg.querySelector(`#corner-hit-${corner}`)

    if (element instanceof SVGGeometryElement && element.isPointInFill(point)) {
      return corner
    }
  }

  return null
}

export const getCornerFill = (corner: CornerZone, isHovered: boolean): string => {
  if (corner === 'bull') {
    return isHovered ? DARTBOARD_COLORS.cornerBullHover : DARTBOARD_COLORS.cornerBull
  }

  if (corner === 'outerBull') {
    return isHovered ? DARTBOARD_COLORS.cornerOuterBullHover : DARTBOARD_COLORS.cornerOuterBull
  }

  return isHovered ? DARTBOARD_COLORS.cornerActionHover : DARTBOARD_COLORS.cornerAction
}
