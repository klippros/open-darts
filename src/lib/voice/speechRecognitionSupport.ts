import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionPhraseConstructor,
} from '../../types/speechRecognition'

const readGlobal = (name: string): unknown => Reflect.get(globalThis, name)

export const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }

  const SpeechRecognition = readGlobal('SpeechRecognition')
  const webkitSpeechRecognition = readGlobal('webkitSpeechRecognition')

  if (typeof SpeechRecognition === 'function') {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated as a constructor function
    return SpeechRecognition as SpeechRecognitionConstructor
  }

  if (typeof webkitSpeechRecognition === 'function') {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated as a constructor function
    return webkitSpeechRecognition as SpeechRecognitionConstructor
  }

  return null
}

export const getSpeechRecognitionPhraseConstructor =
  (): SpeechRecognitionPhraseConstructor | null => {
    if (typeof globalThis === 'undefined') {
      return null
    }

    const Phrase = readGlobal('SpeechRecognitionPhrase')

    if (typeof Phrase !== 'function') {
      return null
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated as a constructor function
    return Phrase as SpeechRecognitionPhraseConstructor
  }

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognitionConstructor() !== null
