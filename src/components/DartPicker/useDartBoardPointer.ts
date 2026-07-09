import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { ArmedMultiplier } from '../../lib/dartKeyboardInput'
import { getActiveBoardMultiplier } from '../../lib/dartKeyboardInput'
import { DartMultiplier } from '../../types/dart'
import {
  DARTBOARD_CENTER,
  DARTBOARD_CENTER_RADIUS,
  DARTBOARD_INNER_RADIUS,
  DARTBOARD_OUTER_RADIUS,
  getCenterZoneAtPoint,
  getCornerZoneFromPaths,
  getNumberAtPoint,
  toBoardLocalPoint,
} from './dartboardLayout'
import type { CenterZone, CornerZone } from './dartboardLayout'

export interface UseDartBoardPointerOptions {
  onUndo: () => void
  recordNumber: (value: number, multiplier: DartMultiplier) => void
  recordBull: () => void
  recordOuterBull: () => void
  recordMiss: () => void
  armedMultiplier: ArmedMultiplier
  setArmedMultiplier: (multiplier: ArmedMultiplier) => void
  inputDisabled?: boolean
}

const centerZoneToMultiplier = (zone: CenterZone): DartMultiplier =>
  zone === 'double' ? DartMultiplier.Double : DartMultiplier.Triple

const resolveHoverTarget = (
  svg: SVGSVGElement,
  x: number,
  y: number,
): {
  corner: CornerZone | null
  centerZone: CenterZone | null
  number: number | null
} => {
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
    return { corner: null, centerZone: null, number }
  }

  const centerZone = getCenterZoneAtPoint(
    DARTBOARD_CENTER,
    DARTBOARD_CENTER,
    DARTBOARD_CENTER_RADIUS,
    x,
    y,
  )

  if (centerZone !== null) {
    return { corner: null, centerZone, number: null }
  }

  const corner = getCornerZoneFromPaths(svg, x, y)

  return { corner, centerZone: null, number: null }
}

const toActiveMultiplier = (
  multiplier: DartMultiplier | ArmedMultiplier | null,
): DartMultiplier.Double | DartMultiplier.Triple | null => {
  if (multiplier === DartMultiplier.Double || multiplier === DartMultiplier.Triple) {
    return multiplier
  }

  return null
}

export const useDartBoardPointer = ({
  onUndo,
  recordNumber,
  recordBull,
  recordOuterBull,
  recordMiss,
  armedMultiplier,
  setArmedMultiplier,
  inputDisabled = false,
}: UseDartBoardPointerOptions) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [heldMultiplier, setHeldMultiplier] = useState<DartMultiplier | null>(null)
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null)
  const [hoveredCorner, setHoveredCorner] = useState<CornerZone | null>(null)
  const [activeCenterZone, setActiveCenterZone] = useState<CenterZone | null>(null)
  const pointerActiveRef = useRef(false)
  const draggedRef = useRef(false)
  const armedBeforeCenterPressRef = useRef<ArmedMultiplier>(DartMultiplier.Single)

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current

    if (svg === null) {
      return null
    }

    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY

    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse())

    return {
      x: transformed.x,
      y: transformed.y,
    }
  }, [])

  const updateHoverFromPoint = useCallback((x: number, y: number) => {
    const svg = svgRef.current

    if (svg === null) {
      return
    }

    const target = resolveHoverTarget(svg, x, y)
    setHoveredCorner(target.corner)
    setActiveCenterZone(target.centerZone)
    setHoveredNumber(target.number)
  }, [])

  const clearPointerState = useCallback(() => {
    pointerActiveRef.current = false
    draggedRef.current = false
    setHeldMultiplier(null)
    setHoveredNumber(null)
    setHoveredCorner(null)
    setActiveCenterZone(null)
  }, [])

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const point = getSvgPoint(event.clientX, event.clientY)

      if (point === null) {
        return
      }

      const target = resolveHoverTarget(event.currentTarget, point.x, point.y)

      if (target.corner === 'undo') {
        onUndo()
        return
      }

      if (inputDisabled) {
        return
      }

      if (target.corner === 'bull') {
        recordBull()
        return
      }

      if (target.corner === 'outerBull') {
        recordOuterBull()
        return
      }

      if (target.corner === 'miss') {
        recordMiss()
        return
      }

      if (target.centerZone !== null) {
        event.currentTarget.setPointerCapture(event.pointerId)
        pointerActiveRef.current = true
        draggedRef.current = false
        armedBeforeCenterPressRef.current = armedMultiplier
        const multiplier = centerZoneToMultiplier(target.centerZone)
        setHeldMultiplier(multiplier)
        setArmedMultiplier(multiplier)
        setActiveCenterZone(target.centerZone)
        setHoveredNumber(null)
        setHoveredCorner(null)
        return
      }

      if (target.number !== null) {
        const multiplier =
          armedMultiplier === DartMultiplier.Single ? DartMultiplier.Single : armedMultiplier
        recordNumber(target.number, multiplier)
        setArmedMultiplier(DartMultiplier.Single)
      }
    },
    [
      armedMultiplier,
      inputDisabled,
      getSvgPoint,
      onUndo,
      recordBull,
      recordMiss,
      recordNumber,
      recordOuterBull,
      setArmedMultiplier,
    ],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const point = getSvgPoint(event.clientX, event.clientY)

      if (point === null) {
        return
      }

      if (pointerActiveRef.current) {
        draggedRef.current = true
        updateHoverFromPoint(point.x, point.y)
        return
      }

      updateHoverFromPoint(point.x, point.y)
    },
    [getSvgPoint, updateHoverFromPoint],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (inputDisabled || !pointerActiveRef.current) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const point = getSvgPoint(event.clientX, event.clientY)

      if (point !== null && !draggedRef.current) {
        const target = resolveHoverTarget(event.currentTarget, point.x, point.y)

        if (target.centerZone !== null) {
          const multiplier = centerZoneToMultiplier(target.centerZone)

          if (armedBeforeCenterPressRef.current === multiplier) {
            setArmedMultiplier(DartMultiplier.Single)
          }
        }
      }

      if (point !== null && draggedRef.current && heldMultiplier !== null) {
        const target = resolveHoverTarget(event.currentTarget, point.x, point.y)

        if (target.number !== null) {
          recordNumber(target.number, heldMultiplier)
          setArmedMultiplier(DartMultiplier.Single)
        }
      }

      clearPointerState()
      armedBeforeCenterPressRef.current = DartMultiplier.Single
    },
    [clearPointerState, getSvgPoint, heldMultiplier, inputDisabled, recordNumber, setArmedMultiplier],
  )

  const handlePointerLeave = useCallback(() => {
    if (!pointerActiveRef.current) {
      setHoveredNumber(null)
      setHoveredCorner(null)
      setActiveCenterZone(null)
    }
  }, [])

  return {
    svgRef,
    activeMultiplier: toActiveMultiplier(heldMultiplier ?? getActiveBoardMultiplier(armedMultiplier)),
    hoveredNumber,
    hoveredCorner,
    activeCenterZone,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  }
}
