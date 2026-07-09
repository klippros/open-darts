import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { ArmedMultiplier } from '../../lib/dartKeyboardInput'
import { getActiveBoardMultiplier } from '../../lib/dartKeyboardInput'
import { DartMultiplier } from '../../types/dart'
import { resolveBoardHoverTarget } from './boardHover'
import type { CenterZone, CornerZone } from './dartboardLayout'
import { resolveCenterDragRelease } from './centerDragGesture'

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
  const centerDragRef = useRef<{ zone: CenterZone; armedBefore: ArmedMultiplier } | null>(null)

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

  const clearCenterDragState = useCallback(() => {
    centerDragRef.current = null
    setHeldMultiplier(null)
    setActiveCenterZone(null)
    setHoveredNumber(null)
    setHoveredCorner(null)
  }, [])

  const handleCornerClick = useCallback(
    (corner: CornerZone) => {
      if (corner === 'undo') {
        onUndo()
        return
      }

      if (inputDisabled) {
        return
      }

      switch (corner) {
        case 'bull':
          recordBull()
          break
        case 'outerBull':
          recordOuterBull()
          break
        case 'miss':
          recordMiss()
          break
        default: {
          const exhaustive: never = corner
          throw new Error(`Unknown corner zone: ${String(exhaustive)}`)
        }
      }
    },
    [inputDisabled, onUndo, recordBull, recordMiss, recordOuterBull],
  )

  const handleNumberClick = useCallback(
    (number: number) => {
      if (inputDisabled) {
        return
      }

      const multiplier =
        armedMultiplier === DartMultiplier.Single ? DartMultiplier.Single : armedMultiplier
      recordNumber(number, multiplier)
      setArmedMultiplier(DartMultiplier.Single)
    },
    [armedMultiplier, inputDisabled, recordNumber, setArmedMultiplier],
  )

  const handleCenterPointerDown = useCallback(
    (zone: CenterZone, event: PointerEvent<SVGPathElement>) => {
      if (inputDisabled) {
        return
      }

      svgRef.current?.setPointerCapture(event.pointerId)
      centerDragRef.current = { zone, armedBefore: armedMultiplier }
      setHeldMultiplier(centerZoneToMultiplier(zone))
      setActiveCenterZone(zone)
      setHoveredNumber(null)
      setHoveredCorner(null)
    },
    [armedMultiplier, inputDisabled],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const point = getSvgPoint(event.clientX, event.clientY)

      if (point === null || centerDragRef.current === null) {
        return
      }

      const target = resolveBoardHoverTarget(point.x, point.y)
      setHoveredNumber(target.number)
      setActiveCenterZone(target.centerZone ?? centerDragRef.current.zone)
    },
    [getSvgPoint],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const drag = centerDragRef.current

      if (drag === null) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const point = getSvgPoint(event.clientX, event.clientY)
      const release =
        point === null
          ? { number: null, centerZone: null }
          : resolveBoardHoverTarget(point.x, point.y)

      for (const action of resolveCenterDragRelease(drag.zone, release, drag.armedBefore)) {
        if (action.type === 'recordNumber') {
          recordNumber(action.value, action.multiplier)
        } else {
          setArmedMultiplier(action.multiplier)
        }
      }

      clearCenterDragState()
    },
    [clearCenterDragState, getSvgPoint, recordNumber, setArmedMultiplier],
  )

  const handlePointerLeave = useCallback(() => {
    if (centerDragRef.current === null) {
      setHoveredNumber(null)
      setHoveredCorner(null)
      setActiveCenterZone(null)
    }
  }, [])

  return {
    svgRef,
    activeMultiplier: toActiveMultiplier(
      heldMultiplier ?? getActiveBoardMultiplier(armedMultiplier),
    ),
    hoveredNumber,
    hoveredCorner,
    activeCenterZone,
    handleCornerClick,
    handleNumberClick,
    handleCenterPointerDown,
    handleCornerHover: setHoveredCorner,
    handleNumberHover: setHoveredNumber,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  }
}
