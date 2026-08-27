export type CommandIsolationOutcome =
  | { type: 'reject' }
  | { type: 'hold'; delayMs: number }
  | { type: 'execute' }
  | { type: 'cancel-hold' }

export interface CommandIsolationState {
  lastSpeechAt: number | null
  pending: boolean
  pendingSince: number | null
}

/** Silence required before and after a voice command. */
export const VOICE_COMMAND_ISOLATION_MS = 400

/** Delay after score-caller TTS before listening again. */
export const VOICE_CALLER_RESUME_MS = 500

export const createCommandIsolationState = (): CommandIsolationState => ({
  lastSpeechAt: null,
  pending: false,
  pendingSince: null,
})

/**
 * Pure isolation state machine.
 * Valid candidates must have quiet T before and after; extra speech cancels a hold.
 */
export const commandIsolationOnTranscript = (
  state: CommandIsolationState,
  now: number,
  isValidCommand: boolean,
): { state: CommandIsolationState; outcome: CommandIsolationOutcome } => {
  const T = VOICE_COMMAND_ISOLATION_MS

  if (state.pending) {
    // Any further speech cancels the hold (valid or not).
    return {
      state: {
        lastSpeechAt: now,
        pending: false,
        pendingSince: null,
      },
      outcome: { type: 'cancel-hold' },
    }
  }

  if (!isValidCommand) {
    return {
      state: {
        ...state,
        lastSpeechAt: now,
        pending: false,
        pendingSince: null,
      },
      outcome: { type: 'reject' },
    }
  }

  const preGapOk = state.lastSpeechAt === null || now - state.lastSpeechAt >= T

  if (!preGapOk) {
    return {
      state: {
        lastSpeechAt: now,
        pending: false,
        pendingSince: null,
      },
      outcome: { type: 'reject' },
    }
  }

  return {
    state: {
      lastSpeechAt: now,
      pending: true,
      pendingSince: now,
    },
    outcome: { type: 'hold', delayMs: T },
  }
}

export const commandIsolationOnTimer = (
  state: CommandIsolationState,
  now: number,
): { state: CommandIsolationState; outcome: CommandIsolationOutcome } => {
  const T = VOICE_COMMAND_ISOLATION_MS

  if (!state.pending || state.pendingSince === null) {
    return { state, outcome: { type: 'reject' } }
  }

  if (now - state.pendingSince < T) {
    return { state, outcome: { type: 'reject' } }
  }

  return {
    state: {
      lastSpeechAt: state.lastSpeechAt,
      pending: false,
      pendingSince: null,
    },
    outcome: { type: 'execute' },
  }
}
