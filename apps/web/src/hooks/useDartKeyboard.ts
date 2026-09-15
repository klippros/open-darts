import { useCallback, useEffect, useRef } from 'react'
import { getDartKeyboardPreview, processDartKeyboardKey } from '../lib/dartKeyboardInput'
import type { DartKeyboardInputState } from '../lib/dartKeyboardInput'
import type { DartThrow } from '@open-darts/game/types/dart'

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
  inputState: DartKeyboardInputState
  setInputState: React.Dispatch<React.SetStateAction<DartKeyboardInputState>>
  onDart: (dart: DartThrow) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

export const useDartKeyboard = ({
  inputState,
  setInputState,
  onDart,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: UseDartKeyboardOptions) => {
  const inputStateRef = useRef(inputState)
  inputStateRef.current = inputState

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

      if (isUndoKey && undoDisabled) {
        return
      }

      if (inputDisabled && !isUndoKey) {
        return
      }

      const result = processDartKeyboardKey(inputStateRef.current, event.key)
      setInputState(result.state)
      applyOutputs(result.outputs)

      if (result.outputs.length > 0 || result.state.numberBuffer !== '' || event.key === ' ') {
        event.preventDefault()
      }

      if (event.key === 'Tab' || event.key === 'Backspace') {
        event.preventDefault()
      }
    },
    [applyOutputs, inputDisabled, setInputState, undoDisabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return { preview: getDartKeyboardPreview(inputState) }
}
