import {
  DARTBOARD_CENTER,
  DARTBOARD_CENTER_RADIUS,
  DARTBOARD_COLORS,
  DARTBOARD_CORNER_INNER_RADIUS,
  DARTBOARD_VIEWBOX_SIZE,
  polarToCartesian,
} from './dartboardLayout'

export const DARTBOARD_DIVIDER = {
  stroke: DARTBOARD_COLORS.background,
  strokeWidth: 10,
} as const

export type DividerLineId = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface DividerLine {
  id: DividerLineId
  x1: number
  y1: number
  x2: number
  y2: number
}

export const getCenterDividerLine = (): DividerLine => ({
  id: 'center',
  x1: DARTBOARD_CENTER,
  y1: DARTBOARD_CENTER - DARTBOARD_CENTER_RADIUS,
  x2: DARTBOARD_CENTER,
  y2: DARTBOARD_CENTER + DARTBOARD_CENTER_RADIUS,
})

export const getCornerDividerLines = (): DividerLine[] => {
  const top = polarToCartesian(DARTBOARD_CENTER, DARTBOARD_CENTER, DARTBOARD_CORNER_INNER_RADIUS, 0)
  const right = polarToCartesian(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_CORNER_INNER_RADIUS,
    90,
  )
  const bottom = polarToCartesian(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_CORNER_INNER_RADIUS,
    180,
  )
  const left = polarToCartesian(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_CORNER_INNER_RADIUS,
    270,
  )

  return [
    { id: 'top', x1: DARTBOARD_CENTER, y1: 0, x2: top.x, y2: top.y },
    {
      id: 'bottom',
      x1: DARTBOARD_CENTER,
      y1: DARTBOARD_VIEWBOX_SIZE,
      x2: bottom.x,
      y2: bottom.y,
    },
    { id: 'left', x1: 0, y1: DARTBOARD_CENTER, x2: left.x, y2: left.y },
    {
      id: 'right',
      x1: DARTBOARD_VIEWBOX_SIZE,
      y1: DARTBOARD_CENTER,
      x2: right.x,
      y2: right.y,
    },
  ]
}
