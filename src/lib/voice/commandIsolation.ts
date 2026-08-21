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

export const createCommandIsolationState = (): CommandIsolationState => ({
  lastSpeechAt: null,
  pending: false,
  pendingSince: null,
})

export const DEFAULT_VOICE_ISOLATION_MS = 400
export const MIN_VOICE_ISOLATION_MS = 0
export const MAX_VOICE_ISOLATION_MS = 1500

export const clampVoiceIsolationMs = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOICE_ISOLATION_MS
  }

  return Math.min(MAX_VOICE_ISOLATION_MS, Math.max(MIN_VOICE_ISOLATION_MS, Math.round(value)))
}

/**
 * Pure isolation state machine.
 * Valid candidates must have quiet T before and after; extra speech cancels a hold.
 */
export const commandIsolationOnTranscript = (
  state: CommandIsolationState,
  now: number,
  isolationMs: number,
  isValidCommand: boolean,
): { state: CommandIsolationState; outcome: CommandIsolationOutcome } => {
  const T = clampVoiceIsolationMs(isolationMs)

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

  const preGapOk = T === 0 || state.lastSpeechAt === null || now - state.lastSpeechAt >= T

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

  if (T === 0) {
    return {
      state: {
        lastSpeechAt: now,
        pending: false,
        pendingSince: null,
      },
      outcome: { type: 'execute' },
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
  isolationMs: number,
): { state: CommandIsolationState; outcome: CommandIsolationOutcome } => {
  const T = clampVoiceIsolationMs(isolationMs)

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
