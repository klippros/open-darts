import { createDartThrow } from './dartScoring'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'

export type ArmedMultiplier = DartMultiplier.Single | DartMultiplier.Double | DartMultiplier.Triple

export interface DartKeyboardInputState {
  armedMultiplier: ArmedMultiplier
  numberBuffer: string
}

export const createDartKeyboardInputState = (): DartKeyboardInputState => ({
  armedMultiplier: DartMultiplier.Single,
  numberBuffer: '',
})

export type DartKeyboardOutput =
  { type: 'dart'; dart: DartThrow } | { type: 'undo' } | { type: 'clearModifier' }

export interface DartKeyboardStepResult {
  state: DartKeyboardInputState
  outputs: DartKeyboardOutput[]
}

const recordNumber = (value: number, multiplier: ArmedMultiplier): DartKeyboardOutput => ({
  type: 'dart',
  dart: createDartThrow({ type: DartSegmentType.Number, value }, multiplier),
})

const recordOuterBull = (): DartKeyboardOutput => ({
  type: 'dart',
  dart: createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single),
})

const recordBull = (): DartKeyboardOutput => ({
  type: 'dart',
  dart: createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single),
})

const recordMiss = (): DartKeyboardOutput => ({
  type: 'dart',
  dart: createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss),
})

const resetInput = (state: DartKeyboardInputState): DartKeyboardInputState => ({
  ...state,
  armedMultiplier: DartMultiplier.Single,
  numberBuffer: '',
})

const recordAndReset = (
  state: DartKeyboardInputState,
  output: DartKeyboardOutput,
): DartKeyboardStepResult => ({
  state: resetInput(state),
  outputs: [output],
})

const isDigit = (key: string): boolean => /^[0-9]$/u.test(key)

const recordSegment = (state: DartKeyboardInputState, value: number): DartKeyboardStepResult =>
  recordAndReset(state, recordNumber(value, state.armedMultiplier))

export const processDartKeyboardKey = (
  state: DartKeyboardInputState,
  key: string,
): DartKeyboardStepResult => {
  const normalizedKey = key.length === 1 ? key.toLowerCase() : key

  if (normalizedKey === 'd') {
    return {
      state: {
        ...state,
        armedMultiplier: DartMultiplier.Double,
        numberBuffer: '',
      },
      outputs: [],
    }
  }

  if (normalizedKey === 't') {
    return {
      state: {
        ...state,
        armedMultiplier: DartMultiplier.Triple,
        numberBuffer: '',
      },
      outputs: [],
    }
  }

  if (normalizedKey === 'b') {
    return recordAndReset(state, recordBull())
  }

  if (normalizedKey === 'Tab') {
    return recordAndReset(state, recordMiss())
  }

  if (normalizedKey === 'Backspace') {
    return {
      state: resetInput(state),
      outputs: [{ type: 'undo' }],
    }
  }

  if (normalizedKey === 'Escape') {
    const outputs =
      state.armedMultiplier === DartMultiplier.Single ? [] : [{ type: 'clearModifier' as const }]

    return {
      state: resetInput(state),
      outputs,
    }
  }

  if (!isDigit(normalizedKey)) {
    return { state, outputs: [] }
  }

  if (state.numberBuffer === '1') {
    const value = Number(`1${normalizedKey}`)

    if (value >= 10 && value <= 19) {
      return recordSegment(state, value)
    }
  }

  if (state.numberBuffer === '2' && normalizedKey === '0') {
    return recordSegment(state, 20)
  }

  if (state.numberBuffer === '2' && normalizedKey === '5') {
    return recordAndReset(state, recordOuterBull())
  }

  if (state.numberBuffer === '2') {
    const firstDart = recordSegment({ ...state, numberBuffer: '' }, 2)

    return processDartKeyboardKey(firstDart.state, normalizedKey)
  }

  if (state.numberBuffer === '') {
    if (normalizedKey >= '3' && normalizedKey <= '9') {
      return recordSegment(state, Number(normalizedKey))
    }

    return {
      state: {
        ...state,
        numberBuffer: normalizedKey,
      },
      outputs: [],
    }
  }

  return { state, outputs: [] }
}

export const processDartKeyboardNumberTimeout = (
  state: DartKeyboardInputState,
): DartKeyboardStepResult => {
  if (state.numberBuffer === '1' || state.numberBuffer === '2') {
    return recordSegment(state, Number(state.numberBuffer))
  }

  return { state, outputs: [] }
}

export const processDartKeyboardModifierTimeout = (
  state: DartKeyboardInputState,
): DartKeyboardStepResult => {
  if (state.armedMultiplier === DartMultiplier.Single) {
    return { state, outputs: [] }
  }

  return {
    state: {
      ...state,
      armedMultiplier: DartMultiplier.Single,
    },
    outputs: [{ type: 'clearModifier' }],
  }
}
