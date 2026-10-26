import { useState } from 'react'
import type { PointerEventHandler } from 'react'
import { PRESS_SCALE_ACTIVE, pressTargetProps } from './pressScale'

export interface UsePressScaleOptions {
  /** When set, enlarge the inner layer on hover (e.g. ghost cards without theme hover). */
  hoverScale?: number
  activeScale?: number
  disabled?: boolean
}

export interface UsePressScaleResult {
  scale: number
  pressTargetProps: typeof pressTargetProps
  pointerHandlers: {
    onPointerEnter: PointerEventHandler
    onPointerLeave: PointerEventHandler
    onPointerDown: PointerEventHandler
    onPointerUp: PointerEventHandler
    onPointerCancel: PointerEventHandler
  }
}

/**
 * Press (and optional hover) scale as React state on an inner layer.
 * Keeps the parent's hit target fixed — important for mobile taps.
 */
export const usePressScale = ({
  hoverScale = 1,
  activeScale = PRESS_SCALE_ACTIVE,
  disabled = false,
}: UsePressScaleOptions = {}): UsePressScaleResult => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  let scale = 1
  if (!disabled) {
    if (pressed) {
      scale = activeScale
    } else if (hovered && hoverScale !== 1) {
      scale = hoverScale
    }
  }

  return {
    scale,
    pressTargetProps,
    pointerHandlers: {
      onPointerEnter: () => {
        if (!disabled) {
          setHovered(true)
        }
      },
      onPointerLeave: () => {
        setHovered(false)
        setPressed(false)
      },
      onPointerDown: (event) => {
        if (disabled || event.button !== 0) {
          return
        }
        setPressed(true)
      },
      onPointerUp: () => {
        setPressed(false)
      },
      onPointerCancel: () => {
        setPressed(false)
      },
    },
  }
}
