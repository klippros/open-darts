import type { SpeechRecognitionConstructor } from '../../types/speechRecognition'

export const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }

  const SpeechRecognition = Reflect.get(globalThis, 'SpeechRecognition') as
    SpeechRecognitionConstructor | undefined
  const webkitSpeechRecognition = Reflect.get(globalThis, 'webkitSpeechRecognition') as
    SpeechRecognitionConstructor | undefined

  return SpeechRecognition ?? webkitSpeechRecognition ?? null
}

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognitionConstructor() !== null
