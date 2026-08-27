import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionPhraseConstructor,
} from '../../types/speechRecognition'

/** BCP 47 tag used for on-device English recognition and phrase biasing. */
export const DEFAULT_SPEECH_RECOGNITION_LANG = 'en-US'

export enum SpeechRecognitionAvailability {
  Available = 'available',
  Downloadable = 'downloadable',
  Downloading = 'downloading',
  Unavailable = 'unavailable',
}

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

const AVAILABILITY_VALUES: ReadonlySet<string> = new Set(
  Object.values(SpeechRecognitionAvailability),
)

const parseAvailabilityStatus = (value: string): SpeechRecognitionAvailability => {
  if (!AVAILABILITY_VALUES.has(value)) {
    return SpeechRecognitionAvailability.Unavailable
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowed via AVAILABILITY_VALUES
  return value as SpeechRecognitionAvailability
}

/**
 * Whether on-device recognition for the language can be used now or after install.
 * Hides the mic when the pack is unavailable (typical on mobile / cloud-only browsers).
 */
export const isLocalSpeechRecognitionUsable = (status: SpeechRecognitionAvailability): boolean =>
  status !== SpeechRecognitionAvailability.Unavailable

/**
 * Probe whether a local English (or other) speech model is available / downloadable.
 * Requires `SpeechRecognition.available({ processLocally: true })` — without it we
 * cannot confirm on-device recognition and treat the device as unsupported.
 */
export const checkLocalSpeechRecognitionAvailability = async (
  lang: string = DEFAULT_SPEECH_RECOGNITION_LANG,
): Promise<SpeechRecognitionAvailability> => {
  const Recognition = getSpeechRecognitionConstructor()

  if (Recognition === null) {
    return SpeechRecognitionAvailability.Unavailable
  }

  const available = Recognition.available

  if (typeof available !== 'function') {
    return SpeechRecognitionAvailability.Unavailable
  }

  try {
    const status = await available.call(Recognition, {
      langs: [lang],
      processLocally: true,
      quality: 'command',
    })
    return parseAvailabilityStatus(status)
  } catch {
    return SpeechRecognitionAvailability.Unavailable
  }
}
