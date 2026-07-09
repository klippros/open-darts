import { describe, expect, it } from 'vitest'
import {
  createDartKeyboardInputState,
  getDartKeyboardPreview,
  processDartKeyboardKey,
} from './dartKeyboardInput'
import { DartMultiplier, DartSegmentType } from '../types/dart'

const confirm = (state: ReturnType<typeof processDartKeyboardKey>['state']) =>
  processDartKeyboardKey(state, ' ')

describe('processDartKeyboardKey', () => {
  it('records singles after number entry is confirmed with space', () => {
    const typed = processDartKeyboardKey(createDartKeyboardInputState(), '7')
    expect(typed.state.numberBuffer).toBe('7')
    expect(typed.outputs).toHaveLength(0)

    const result = confirm(typed.state)
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 7 },
        multiplier: DartMultiplier.Single,
        points: 7,
      },
    })
  })

  it('buffers digits until space is pressed', () => {
    const one = processDartKeyboardKey(createDartKeyboardInputState(), '1')
    expect(one.state.numberBuffer).toBe('1')
    expect(one.outputs).toHaveLength(0)

    const two = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    expect(two.state.numberBuffer).toBe('2')
    expect(two.outputs).toHaveLength(0)
  })

  it('records 10 through 19 after space', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '1')
    const typed = processDartKeyboardKey(state, '4')
    const result = confirm(typed.state)
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 14 },
        points: 14,
      },
    })
  })

  it('records 20 after 2, 0, and space', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const typed = processDartKeyboardKey(state, '0')
    const result = confirm(typed.state)
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.Number, value: 20 },
        points: 20,
      },
    })
  })

  it('records outer bull from 2, 5, and space', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const typed = processDartKeyboardKey(state, '5')
    const result = confirm(typed.state)
    const [output] = result.outputs

    expect(output).toMatchObject({
      type: 'dart',
      dart: {
        segment: { type: DartSegmentType.OuterBull },
        points: 25,
      },
    })
  })

  it('arms double and triple modifiers', () => {
    const { state: doubleState } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    expect(doubleState.armedMultiplier).toBe(DartMultiplier.Double)

    const { state: tripleState } = processDartKeyboardKey(createDartKeyboardInputState(), 't')
    expect(tripleState.armedMultiplier).toBe(DartMultiplier.Triple)
  })

  it('toggles double and triple modifiers when pressed again', () => {
    const { state: armedDouble } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    const { state: disarmedDouble } = processDartKeyboardKey(armedDouble, 'd')
    expect(disarmedDouble.armedMultiplier).toBe(DartMultiplier.Single)

    const { state: armedTriple } = processDartKeyboardKey(createDartKeyboardInputState(), 't')
    const { state: disarmedTriple } = processDartKeyboardKey(armedTriple, 't')
    expect(disarmedTriple.armedMultiplier).toBe(DartMultiplier.Single)
  })

  it('records armed double and triple darts after space', () => {
    const { state: doubleState } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    const { state: withOne } = processDartKeyboardKey(doubleState, '1')
    const typed = processDartKeyboardKey(withOne, '6')
    const doubleDart = confirm(typed.state)
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
    const typedTriple = processDartKeyboardKey(withTwo, '0')
    const tripleDart = confirm(typedTriple.state)
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

  it('clears invalid buffered numbers on space', () => {
    const { state } = processDartKeyboardKey(createDartKeyboardInputState(), '2')
    const typed = processDartKeyboardKey(state, '1')
    const result = confirm(typed.state)

    expect(result.outputs).toHaveLength(0)
    expect(result.state.numberBuffer).toBe('')
  })

  it('clears armed modifier on escape', () => {
    const { state: armed } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    const result = processDartKeyboardKey(armed, 'Escape')

    expect(result.state.armedMultiplier).toBe(DartMultiplier.Single)
    expect(result.outputs).toEqual([{ type: 'clearModifier' }])
  })

  it('exposes board preview state for armed modifiers and buffered numbers', () => {
    const { state: armed } = processDartKeyboardKey(createDartKeyboardInputState(), 'd')
    expect(getDartKeyboardPreview(armed)).toMatchObject({
      activeMultiplier: DartMultiplier.Double,
      highlightedNumber: null,
      highlightOuterBull: false,
    })

    const { state: withFour } = processDartKeyboardKey(armed, '4')
    expect(getDartKeyboardPreview(withFour)).toMatchObject({
      activeMultiplier: DartMultiplier.Double,
      highlightedNumber: 4,
      highlightOuterBull: false,
    })

    const { state: outerBull } = processDartKeyboardKey(
      processDartKeyboardKey(createDartKeyboardInputState(), '2').state,
      '5',
    )
    expect(getDartKeyboardPreview(outerBull)).toMatchObject({
      highlightedNumber: null,
      highlightOuterBull: true,
    })
  })
})
