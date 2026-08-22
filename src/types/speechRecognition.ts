/** Ambient Web Speech API types (webkit-prefixed browsers). */

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { transcript: string; confidence: number }
}

interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionPhraseLike {
  readonly phrase: string
  readonly boost: number
}

type SpeechRecognitionPhraseConstructor = new (
  phrase: string,
  boost?: number,
) => SpeechRecognitionPhraseLike

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  processLocally?: boolean
  unspokenPunctuation?: boolean
  phrases?: SpeechRecognitionPhraseLike[]
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: ((event: Event) => void) | null
  onstart: ((event: Event) => void) | null
  onsoundstart: ((event: Event) => void) | null
  onspeechstart: ((event: Event) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface SpeechRecognitionInstallOptions {
  langs: string[]
  processLocally?: boolean
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike
  available?: (options: SpeechRecognitionInstallOptions) => Promise<string>
  install?: (options: SpeechRecognitionInstallOptions) => Promise<boolean>
}

interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
  SpeechRecognitionPhrase?: SpeechRecognitionPhraseConstructor
}

export type {
  SpeechRecognitionLike,
  SpeechRecognitionConstructor,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionPhraseLike,
  SpeechRecognitionPhraseConstructor,
  SpeechRecognitionInstallOptions,
  WindowWithSpeechRecognition,
}
