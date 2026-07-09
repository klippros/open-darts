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

const confirmNumberBuffer = (state: DartKeyboardInputState): DartKeyboardStepResult => {
  const { numberBuffer } = state

  if (numberBuffer === '') {
    return { state, outputs: [] }
  }

  if (numberBuffer === '25') {
    return recordAndReset(state, recordOuterBull())
  }

  const value = Number(numberBuffer)

  if (Number.isInteger(value) && value >= 1 && value <= 20) {
    return recordSegment(state, value)
  }

  return {
    state: {
      ...state,
      numberBuffer: '',
    },
    outputs: [],
  }
}

export const processDartKeyboardKey = (
  state: DartKeyboardInputState,
  key: string,
): DartKeyboardStepResult => {
  const normalizedKey = key.length === 1 ? key.toLowerCase() : key

  if (normalizedKey === 'd') {
    const armedMultiplier =
      state.armedMultiplier === DartMultiplier.Double
        ? DartMultiplier.Single
        : DartMultiplier.Double

    return {
      state: {
        ...state,
        armedMultiplier,
        numberBuffer: '',
      },
      outputs: [],
    }
  }

  if (normalizedKey === 't') {
    const armedMultiplier =
      state.armedMultiplier === DartMultiplier.Triple
        ? DartMultiplier.Single
        : DartMultiplier.Triple

    return {
      state: {
        ...state,
        armedMultiplier,
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

  if (normalizedKey === ' ') {
    return confirmNumberBuffer(state)
  }

  if (!isDigit(normalizedKey)) {
    return { state, outputs: [] }
  }

  const numberBuffer =
    state.numberBuffer.length >= 2 ? normalizedKey : `${state.numberBuffer}${normalizedKey}`

  return {
    state: {
      ...state,
      numberBuffer,
    },
    outputs: [],
  }
}

export interface DartKeyboardPreview {
  activeMultiplier: DartMultiplier.Double | DartMultiplier.Triple | null
  highlightedNumber: number | null
  highlightOuterBull: boolean
}

export const getActiveBoardMultiplier = (
  armedMultiplier: ArmedMultiplier,
): DartMultiplier.Double | DartMultiplier.Triple | null => {
  if (armedMultiplier === DartMultiplier.Double) {
    return DartMultiplier.Double
  }

  if (armedMultiplier === DartMultiplier.Triple) {
    return DartMultiplier.Triple
  }

  return null
}

export const getDartKeyboardPreview = (state: DartKeyboardInputState): DartKeyboardPreview => {
  const activeMultiplier = getActiveBoardMultiplier(state.armedMultiplier)

  if (state.numberBuffer === '25') {
    return {
      activeMultiplier,
      highlightedNumber: null,
      highlightOuterBull: true,
    }
  }

  const value = Number(state.numberBuffer)

  return {
    activeMultiplier,
    highlightedNumber:
      Number.isInteger(value) && value >= 1 && value <= 20 ? value : null,
    highlightOuterBull: false,
  }
}
