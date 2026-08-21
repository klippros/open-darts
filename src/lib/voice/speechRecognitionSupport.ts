import type { SpeechRecognitionConstructor } from '../../types/speechRecognition'

const isSpeechRecognitionConstructor = (value: unknown): value is SpeechRecognitionConstructor =>
  typeof value === 'function'

const readGlobalConstructor = (name: string): unknown => Reflect.get(globalThis, name)

export const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }

  const SpeechRecognition = readGlobalConstructor('SpeechRecognition')
  const webkitSpeechRecognition = readGlobalConstructor('webkitSpeechRecognition')

  if (isSpeechRecognitionConstructor(SpeechRecognition)) {
    return SpeechRecognition
  }

  if (isSpeechRecognitionConstructor(webkitSpeechRecognition)) {
    return webkitSpeechRecognition
  }

  return null
}

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognitionConstructor() !== null
