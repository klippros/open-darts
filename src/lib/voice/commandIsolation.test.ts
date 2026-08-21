import { describe, expect, it } from 'vitest'
import {
  clampVoiceIsolationMs,
  commandIsolationOnTimer,
  commandIsolationOnTranscript,
  createCommandIsolationState,
} from './commandIsolation'

describe('commandIsolation', () => {
  it('executes immediately when T is 0', () => {
    const { outcome } = commandIsolationOnTranscript(createCommandIsolationState(), 1000, 0, true)

    expect(outcome).toEqual({ type: 'execute' })
  })

  it('rejects valid command when prior speech is within pre-gap', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, 400, false))
    const { outcome } = commandIsolationOnTranscript(state, 1200, 400, true)

    expect(outcome).toEqual({ type: 'reject' })
  })

  it('holds valid command then executes after post-gap', () => {
    let state = createCommandIsolationState()
    let outcome
    ;({ state, outcome } = commandIsolationOnTranscript(state, 1000, 400, true))
    expect(outcome).toEqual({ type: 'hold', delayMs: 400 })

    ;({ state, outcome } = commandIsolationOnTimer(state, 1400, 400))
    expect(outcome).toEqual({ type: 'execute' })
    expect(state.pending).toBe(false)
  })

  it('cancels hold when further speech arrives', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, 400, true))
    const { outcome } = commandIsolationOnTranscript(state, 1100, 400, true)

    expect(outcome).toEqual({ type: 'cancel-hold' })
  })

  it('allows valid command after quiet pre-gap', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, 400, false))
    const { outcome } = commandIsolationOnTranscript(state, 1500, 400, true)

    expect(outcome).toEqual({ type: 'hold', delayMs: 400 })
  })

  it('clamps isolation ms', () => {
    expect(clampVoiceIsolationMs(-10)).toBe(0)
    expect(clampVoiceIsolationMs(2000)).toBe(1500)
    expect(clampVoiceIsolationMs(Number.NaN)).toBe(400)
  })
})
