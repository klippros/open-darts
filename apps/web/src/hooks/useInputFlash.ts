import { useCallback, useEffect, useRef, useState } from 'react'
import type { InputFlashKind, InputFlashLabel } from '../lib/inputFlash/buildInputFlashLabel'

export interface InputFlashState {
  text: string
  kind: InputFlashKind
  id: number
}

const FLASH_DURATION_MS = 900

export const useInputFlash = () => {
  const [flash, setFlash] = useState<InputFlashState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextIdRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const showFlash = useCallback(
    (label: InputFlashLabel) => {
      clearTimer()
      nextIdRef.current += 1
      setFlash({ text: label.text, kind: label.kind, id: nextIdRef.current })
      timeoutRef.current = setTimeout(() => {
        setFlash(null)
        timeoutRef.current = null
      }, FLASH_DURATION_MS)
    },
    [clearTimer],
  )

  useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer],
  )

  return { flash, showFlash }
}
