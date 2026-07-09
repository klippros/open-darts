import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDartKeyboardInputState,
  processDartKeyboardKey,
  processDartKeyboardModifierTimeout,
  processDartKeyboardNumberTimeout,
} from '../lib/dartKeyboardInput'
import type { DartThrow } from '../types/dart'
import { DartMultiplier } from '../types/dart'

const NUMBER_ENTRY_TIMEOUT_MS = 800
const MODIFIER_TIMEOUT_MS = 2000

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

export const useDartKeyboard = ({
  onDart,
  onUndo,
  inputDisabled = false,
}: UseDartKeyboardOptions) => {
  const [inputState, setInputState] = useState(createDartKeyboardInputState)
  const inputStateRef = useRef(inputState)
  const numberTimeoutRef = useRef<number | null>(null)
  const modifierTimeoutRef = useRef<number | null>(null)

  const clearNumberTimeout = useCallback(() => {
    if (numberTimeoutRef.current !== null) {
      window.clearTimeout(numberTimeoutRef.current)
      numberTimeoutRef.current = null
    }
  }, [])

  const clearModifierTimeout = useCallback(() => {
    if (modifierTimeoutRef.current !== null) {
      window.clearTimeout(modifierTimeoutRef.current)
      modifierTimeoutRef.current = null
    }
  }, [])

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

  const scheduleNumberTimeout = useCallback(() => {
    clearNumberTimeout()

    numberTimeoutRef.current = window.setTimeout(() => {
      const result = processDartKeyboardNumberTimeout(inputStateRef.current)
      inputStateRef.current = result.state
      setInputState(result.state)
      applyOutputs(result.outputs)
      numberTimeoutRef.current = null
    }, NUMBER_ENTRY_TIMEOUT_MS)
  }, [applyOutputs, clearNumberTimeout])

  const scheduleModifierTimeout = useCallback(() => {
    clearModifierTimeout()

    modifierTimeoutRef.current = window.setTimeout(() => {
      const result = processDartKeyboardModifierTimeout(inputStateRef.current)
      inputStateRef.current = result.state
      setInputState(result.state)
      modifierTimeoutRef.current = null
    }, MODIFIER_TIMEOUT_MS)
  }, [clearModifierTimeout])

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
      setInputState(result.state)
      applyOutputs(result.outputs)

      if (result.state.numberBuffer === '') {
        clearNumberTimeout()
      } else {
        scheduleNumberTimeout()
      }

      if (result.state.armedMultiplier === DartMultiplier.Single) {
        clearModifierTimeout()
      } else {
        scheduleModifierTimeout()
      }

      if (result.outputs.length > 0 || result.state.numberBuffer !== '') {
        event.preventDefault()
      }

      if (event.key === 'Tab' || event.key === 'Backspace') {
        event.preventDefault()
      }
    },
    [
      applyOutputs,
      clearModifierTimeout,
      clearNumberTimeout,
      inputDisabled,
      scheduleModifierTimeout,
      scheduleNumberTimeout,
    ],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearNumberTimeout()
      clearModifierTimeout()
    }
  }, [clearModifierTimeout, clearNumberTimeout, handleKeyDown])
}
