import { describe, expect, it } from 'vitest'
import {
  VOICE_COMMAND_ISOLATION_MS,
  commandIsolationOnTimer,
  commandIsolationOnTranscript,
  createCommandIsolationState,
} from './commandIsolation'

const T = VOICE_COMMAND_ISOLATION_MS

describe('commandIsolation', () => {
  it('rejects valid command when prior speech is within pre-gap', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, false))
    const { outcome } = commandIsolationOnTranscript(state, 1000 + T - 1, true)

    expect(outcome).toEqual({ type: 'reject' })
  })

  it('holds valid command then executes after post-gap', () => {
    let state = createCommandIsolationState()
    let outcome
    ;({ state, outcome } = commandIsolationOnTranscript(state, 1000, true))
    expect(outcome).toEqual({ type: 'hold', delayMs: T })

    ;({ state, outcome } = commandIsolationOnTimer(state, 1000 + T))
    expect(outcome).toEqual({ type: 'execute' })
    expect(state.pending).toBe(false)
  })

  it('cancels hold when further speech arrives', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, true))
    const { outcome } = commandIsolationOnTranscript(state, 1100, true)

    expect(outcome).toEqual({ type: 'cancel-hold' })
  })

  it('allows valid command after quiet pre-gap', () => {
    let state = createCommandIsolationState()
    ;({ state } = commandIsolationOnTranscript(state, 1000, false))
    const { outcome } = commandIsolationOnTranscript(state, 1000 + T, true)

    expect(outcome).toEqual({ type: 'hold', delayMs: T })
  })
})
