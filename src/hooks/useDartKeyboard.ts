import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDartKeyboardInputState,
  getDartKeyboardPreview,
  processDartKeyboardKey,
} from '../lib/dartKeyboardInput'
import type { DartKeyboardPreview } from '../lib/dartKeyboardInput'
import type { DartThrow } from '../types/dart'

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const { tagName } = target

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export interface UseDartKeyboardOptions {
  onDart: (dart: DartThrow) => void
  onUndo: () => void
  inputDisabled?: boolean
}

const emptyPreview: DartKeyboardPreview = {
  activeMultiplier: null,
  highlightedNumber: null,
  highlightOuterBull: false,
}

export const useDartKeyboard = ({
  onDart,
  onUndo,
  inputDisabled = false,
}: UseDartKeyboardOptions) => {
  const [preview, setPreview] = useState<DartKeyboardPreview>(emptyPreview)
  const inputStateRef = useRef(createDartKeyboardInputState())

  const applyOutputs = useCallback(
    (outputs: ReturnType<typeof processDartKeyboardKey>['outputs']) => {
      for (const output of outputs) {
        if (output.type === 'dart') {
          onDart(output.dart)
        }

        if (output.type === 'undo') {
          onUndo()
        }
      }
    },
    [onDart, onUndo],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      const isUndoKey = event.key === 'Backspace'

      if (inputDisabled && !isUndoKey) {
        return
      }

      const result = processDartKeyboardKey(inputStateRef.current, event.key)
      inputStateRef.current = result.state
      setPreview(getDartKeyboardPreview(result.state))
      applyOutputs(result.outputs)

      if (result.outputs.length > 0 || result.state.numberBuffer !== '' || event.key === ' ') {
        event.preventDefault()
      }

      if (event.key === 'Tab' || event.key === 'Backspace') {
        event.preventDefault()
      }
    },
    [applyOutputs, inputDisabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return { preview }
}
