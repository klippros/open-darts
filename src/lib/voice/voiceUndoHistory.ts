export interface VoiceFingerprint {
  visitCount: number
  pendingCount: number
}

export interface VoiceHistoryEntry {
  sessionId: string
  undoSteps: number
  before: VoiceFingerprint
  after: VoiceFingerprint
}

export const createVoiceFingerprint = (
  visitCount: number,
  pendingCount: number,
): VoiceFingerprint => ({
  visitCount,
  pendingCount,
})

const fingerprintsEqual = (a: VoiceFingerprint, b: VoiceFingerprint): boolean =>
  a.visitCount === b.visitCount && a.pendingCount === b.pendingCount

export const createVoiceUndoHistory = () => {
  const stack: VoiceHistoryEntry[] = []

  const clear = (): void => {
    stack.length = 0
  }

  const clearIfSessionChanged = (sessionId: string): void => {
    if (stack.length > 0 && stack[0]?.sessionId !== sessionId) {
      clear()
    }
  }

  const peek = (): VoiceHistoryEntry | undefined => stack.at(-1)

  const isEligible = (sessionId: string, current: VoiceFingerprint): boolean => {
    const top = peek()

    if (top === undefined || top.sessionId !== sessionId) {
      return false
    }

    return fingerprintsEqual(top.after, current)
  }

  const push = (entry: VoiceHistoryEntry): void => {
    clearIfSessionChanged(entry.sessionId)
    stack.push(entry)
  }

  const pop = (): VoiceHistoryEntry | undefined => stack.pop()

  /** Replace the top entry after a successful fix (pop old, push replacement). */
  const replaceTop = (entry: VoiceHistoryEntry): void => {
    if (stack.length > 0) {
      stack.pop()
    }

    push(entry)
  }

  const size = (): number => stack.length

  return {
    clear,
    clearIfSessionChanged,
    peek,
    isEligible,
    push,
    pop,
    replaceTop,
    size,
  }
}

export type VoiceUndoHistory = ReturnType<typeof createVoiceUndoHistory>
