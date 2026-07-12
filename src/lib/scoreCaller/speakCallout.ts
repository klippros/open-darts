const isSpeechSynthesisAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

let queue: string[] = []
let speaking = false

const processQueue = (): void => {
  if (!isSpeechSynthesisAvailable() || speaking || queue.length === 0) {
    return
  }

  speaking = true
  const phrase = queue.shift()

  if (phrase === undefined) {
    speaking = false
    return
  }

  const utterance = new SpeechSynthesisUtterance(phrase)
  utterance.lang = 'en-GB'
  utterance.rate = 1.05

  let finished = false

  const finish = (): void => {
    if (finished) {
      return
    }

    finished = true
    speaking = false
    processQueue()
  }

  utterance.onend = finish
  utterance.onerror = finish
  window.speechSynthesis.speak(utterance)
}

export const enqueueCallout = (phrase: string | null): void => {
  if (phrase === null || !isSpeechSynthesisAvailable()) {
    return
  }

  queue.push(phrase)
  processQueue()
}

export const cancelCallouts = (): void => {
  queue = []

  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel()
  }

  speaking = false
}

export const resetCalloutQueueForTests = (): void => {
  cancelCallouts()
}
