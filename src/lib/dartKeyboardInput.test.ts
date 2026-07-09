import { describe, expect, it } from 'vitest'
import {
  createDartKeyboardInputState,
  processDartKeyboardKey,
  processDartKeyboardModifierTimeout,
  processDartKeyboardNumberTimeout,
} from './dartKeyboardInput'
import { DartMultiplier, DartSegmentType } from '../types/dart'

describe('processDartKeyboardKey', () => {
  it('records singles for digits 3 through 9', () => {
    const state = createDartKeyboardInputState()
    const result = processDartKeyboardKey(state, '7')

    expect(result.outputs).toHaveLength(1)
    expect(result.outputs[0]).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 7 },
        multiplier: DartMultiplier.Single,
        points: 7,
      },
    })
  })

  it('buffers 1 and 2 for two-digit entry', () => {
    const one = processDartKeyboardKey(createDartKeyboardInputState(), '1')
    expect(one.state.numberBuffer).toBe('1')
    expect(one.outputs).toHaveLength(0)

    const two = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    expect(two.state.numberBuffer).toBe('2')
    expect(two.outputs).toHaveLength(0)
  })

  it('records 10 through 19 from a 1 prefix', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '1')
    const result = processDartKeyboardKey(state, '4')
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 14 },
        points: 14,
      },
    })
  })

  it('records 20 from 2 then 0', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const result = processDartKeyboardKey(state, '0')
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 20 },
        points: 20,
      },
    })
  })

  it('records outer bull from 2 then 5', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const result = processDartKeyboardKey(state, '5')
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.OuterBull },
        points: 25,
      },
    })
  })

  it('completes buffered singles on number timeout', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const result = processDartKeyboardNumberTimeout(state)
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 2 },
        points: 2,
      },
    })
  })

  it('arms double and triple modifiers', () => {
    const { state: doubleState } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    expect(doubleState.armedMultiplier).toBe(DartMultiplier.Double)

    const { state: tripleState } = processDartKeyboardKey(createDartKeyboardInputState(), 't')
    expect(tripleState.armedMultiplier).toBe(DartMultiplier.Triple)
  })

  it('records armed double and triple darts', () => {
    const { state: doubleState } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    const { state: withOne } = processDartKeyboardKey(doubleState, '1')
    const doubleDart = processDartKeyboardKey(withOne, '6')
    const [doubleOutput] = doubleDart.outputs

    expect(doubleOutput).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 16 },
        multiplier: DartMultiplier.Double,
        points: 32,
      },
    })

    const { state: tripleState } = processDartKeyboardKey(createDartKeyboardInputState(), 't')
    const { state: withTwo } = processDartKeyboardKey(tripleState, '2')
    const tripleDart = processDartKeyboardKey(withTwo, '0')
    const [tripleOutput] = tripleDart.outputs

    expect(tripleOutput).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 20 },
        multiplier: DartMultiplier.Triple,
        points: 60,
      },
    })
  })

  it('records bull, miss, and undo shortcuts', () => {
    const bull = processDartKeyboardKey(createDartKeyboardInputState(), 'b')
    const [bullOutput] = bull.outputs

    expect(bullOutput).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Bull },
        points: 50,
      },
    })

    const miss = processDartKeyboardKey(createDartKeyboardInputState(), 'Tab')
    const [missOutput] = miss.outputs

    expect(missOutput).toMatchObject({
      type: 'dart',
      dart: {
        multiplier: DartMultiplier.Miss,
        points: 0,
      },
    })

    const undo = processDartKeyboardKey(createDartKeyboardInputState(), 'Backspace')
    expect(undo.outputs).toEqual([{ type: 'undo' }])
  })

  it('clears armed modifier after timeout', () => {
    const { state: armed } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    const result = processDartKeyboardModifierTimeout(armed)

    expect(result.state.armedMultiplier).toBe(DartMultiplier.Single)
    expect(result.outputs).toEqual([{ type: 'clearModifier' }])
  })
})
