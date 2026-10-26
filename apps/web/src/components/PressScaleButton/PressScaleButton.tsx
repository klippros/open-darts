import { Button } from '@chakra-ui/react'
import type { ButtonProps } from '@chakra-ui/react'
import { PressScaleContent } from './PressScaleContent'
import { usePressScale } from './usePressScale'

export type PressScaleButtonProps = ButtonProps

/**
 * Themed button with press shrink on an inner layer. Hover enlarge comes from
 * the button recipe (whole control). Active shrink is inner-only so the hit
 * target does not move under a finger.
 */
export const PressScaleButton = ({
  children,
  disabled,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}: PressScaleButtonProps) => {
  const { scale, pressTargetProps, pointerHandlers } = usePressScale({
    disabled: disabled === true,
  })

  return (
    <Button
      disabled={disabled}
      {...pressTargetProps}
      {...props}
      onPointerEnter={(event) => {
        pointerHandlers.onPointerEnter(event)
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        pointerHandlers.onPointerLeave(event)
        onPointerLeave?.(event)
      }}
      onPointerDown={(event) => {
        pointerHandlers.onPointerDown(event)
        onPointerDown?.(event)
      }}
      onPointerUp={(event) => {
        pointerHandlers.onPointerUp(event)
        onPointerUp?.(event)
      }}
      onPointerCancel={(event) => {
        pointerHandlers.onPointerCancel(event)
        onPointerCancel?.(event)
      }}
    >
      <PressScaleContent scale={scale}>{children}</PressScaleContent>
    </Button>
  )
}
