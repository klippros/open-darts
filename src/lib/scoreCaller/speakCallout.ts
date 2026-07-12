const isSpeechSynthesisAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

const SPEAK_TIMEOUT_MS = 10_000

let queue: string[] = []
let speaking = false
let processScheduled = false

const syncSpeakingFlag = (): void => {
  if (!speaking || !isSpeechSynthesisAvailable()) {
    return
  }

  const synthesis = window.speechSynthesis

  if (!synthesis.speaking && !synthesis.pending) {
    speaking = false
  }
}

const processQueue = (): void => {
  syncSpeakingFlag()

  if (!isSpeechSynthesisAvailable() || speaking || queue.length === 0) {
    return
  }

  speaking = true
  const phrase = queue.shift()

  if (phrase === undefined) {
    speaking = false
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
    processQueue()
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

  queue.push(phrase)
  scheduleProcessQueue()
}

export const cancelCallouts = (): void => {
  queue = []
  processScheduled = false

  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel()
  }

  speaking = false
}

export const resetCalloutQueueForTests = (): void => {
  cancelCallouts()
}

export const getCalloutQueueStateForTests = (): { speaking: boolean; queued: number } => ({
  speaking,
  queued: queue.length,
})
