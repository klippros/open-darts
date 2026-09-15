import {
  DARTBOARD_CENTER,
  DARTBOARD_CENTER_RADIUS,
  DARTBOARD_INNER_RADIUS,
  DARTBOARD_OUTER_RADIUS,
  getCenterZoneAtPoint,
  getNumberAtPoint,
  toBoardLocalPoint,
} from './dartboardLayout'
import type { CenterZone } from './dartboardLayout'

export interface BoardHoverTarget {
  centerZone: CenterZone | null
  number: number | null
}

export const resolveBoardHoverTarget = (x: number, y: number): BoardHoverTarget => {
  const localPoint = toBoardLocalPoint(x, y)

  const number = getNumberAtPoint(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_INNER_RADIUS,
    DARTBOARD_OUTER_RADIUS,
    localPoint.x,
    localPoint.y,
  )

  if (number !== null) {
    return { centerZone: null, number }
  }

  const centerZone = getCenterZoneAtPoint(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_CENTER_RADIUS,
    x,
    y,
  )

  if (centerZone !== null) {
    return { centerZone, number: null }
  }

  return { centerZone: null, number: null }
}
