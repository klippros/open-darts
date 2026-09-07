const isSpeechSynthesisAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

const SPEAK_TIMEOUT_MS = 10_000
/** Keep callout "active" after TTS ends so mic echo/tail is not transcribed. */
export const CALLOUT_ECHO_HOLD_MS = 350

let queue: string[] = []
let speaking = false
let processScheduled = false
let echoHolding = false
let echoHoldTimer: number | null = null

type CalloutActivityListener = (active: boolean) => void

const activityListeners = new Set<CalloutActivityListener>()
let lastActivity = false

const clearEchoHold = (): void => {
  if (echoHoldTimer !== null) {
    window.clearTimeout(echoHoldTimer)
    echoHoldTimer = null
  }

  echoHolding = false
}

const isCalloutActive = (): boolean => queue.length > 0 || speaking || echoHolding

const notifyActivityListeners = (): void => {
  const active = isCalloutActive()

  if (active === lastActivity) {
    return
  }

  lastActivity = active

  for (const listener of activityListeners) {
    listener(active)
  }
}

/** Subscribe to score-caller activity (queued, speaking, or echo hold). Returns unsubscribe. */
export const subscribeCalloutActivity = (listener: CalloutActivityListener): (() => void) => {
  activityListeners.add(listener)
  listener(isCalloutActive())

  return () => {
    activityListeners.delete(listener)
  }
}

export const getCalloutActivityForTests = (): boolean => isCalloutActive()

const syncSpeakingFlag = (): void => {
  if (!speaking || !isSpeechSynthesisAvailable()) {
    return
  }

  const synthesis = window.speechSynthesis

  if (!synthesis.speaking && !synthesis.pending) {
    speaking = false
  }
}

const beginEchoHold = (): void => {
  clearEchoHold()
  echoHolding = true
  notifyActivityListeners()

  echoHoldTimer = window.setTimeout(() => {
    echoHoldTimer = null
    echoHolding = false
    notifyActivityListeners()
  }, CALLOUT_ECHO_HOLD_MS)
}

const processQueue = (): void => {
  syncSpeakingFlag()

  if (!isSpeechSynthesisAvailable() || speaking || queue.length === 0) {
    notifyActivityListeners()
    return
  }

  clearEchoHold()
  speaking = true
  notifyActivityListeners()
  const phrase = queue.shift()

  if (phrase === undefined) {
    speaking = false
    notifyActivityListeners()
    return
  }

  const synthesis = window.speechSynthesis
  synthesis.resume()

  const utterance = new SpeechSynthesisUtterance(phrase)
  utterance.lang = 'en-GB'
  utterance.rate = 1.05

  let finished = false

  const finish = (): void => {
    if (finished) {
      return
    }

    finished = true
    window.clearTimeout(timeoutId)
    speaking = false

    if (queue.length > 0) {
      processQueue()
      return
    }

    // Speaker/room echo often continues after utterance.onend.
    beginEchoHold()
  }

  const timeoutId = window.setTimeout(finish, SPEAK_TIMEOUT_MS)

  utterance.onend = finish
  utterance.onerror = finish
  synthesis.speak(utterance)
}

const scheduleProcessQueue = (): void => {
  if (processScheduled) {
    return
  }

  processScheduled = true
  window.setTimeout(() => {
    processScheduled = false
    processQueue()
  }, 0)
}

export const enqueueCallout = (phrase: string | null): void => {
  if (phrase === null || !isSpeechSynthesisAvailable()) {
    return
  }

  clearEchoHold()
  queue.push(phrase)
  notifyActivityListeners()
  scheduleProcessQueue()
}

export const cancelCallouts = (): void => {
  queue = []
  processScheduled = false
  clearEchoHold()

  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel()
  }

  speaking = false
  notifyActivityListeners()
}

export const resetCalloutQueueForTests = (): void => {
  cancelCallouts()
  lastActivity = false
}

export const getCalloutQueueStateForTests = (): {
  speaking: boolean
  queued: number
  echoHolding: boolean
} => ({
  speaking,
  queued: queue.length,
  echoHolding,
})
