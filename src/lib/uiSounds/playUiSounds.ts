const withBaseUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//u, '')}`

const HIT_SOUND_URL = withBaseUrl('sounds/hit-chime.mp3')
const MISS_SOUND_URL = withBaseUrl('sounds/miss-swoosh.mp3')
const UNDO_SOUND_URL = withBaseUrl('sounds/undo-chime.mp3')
const PLAYBACK_VOLUME = 0.7

/** Gap between successive hit/miss sounds in a multi-dart voice sequence. */
export const UI_SOUND_SEQUENCE_STAGGER_MS = 320

export type UiSoundKind = 'hit' | 'miss'

const playSoundUrl = async (url: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return
  }

  const audio = new Audio(url)
  audio.volume = PLAYBACK_VOLUME

  try {
    await audio.play()
  } catch {
    // Autoplay can be blocked.
  }
}

export const playHitChime = (): void => {
  void playSoundUrl(HIT_SOUND_URL)
}

export const playMissSwoosh = (): void => {
  void playSoundUrl(MISS_SOUND_URL)
}

export const playUndoChime = (): void => {
  void playSoundUrl(UNDO_SOUND_URL)
}

let sequenceGeneration = 0
let sequenceTimers: number[] = []

const clearSequenceTimers = (): void => {
  for (const timerId of sequenceTimers) {
    globalThis.clearTimeout(timerId)
  }
  sequenceTimers = []
}

/** Cancel any in-flight staggered hit/miss sequence. */
export const cancelUiSoundSequence = (): void => {
  sequenceGeneration += 1
  clearSequenceTimers()
}

const playOne = (kind: UiSoundKind): void => {
  if (kind === 'hit') {
    playHitChime()
    return
  }

  playMissSwoosh()
}

/**
 * Play hit/miss sounds in order with a short stagger so multi-dart voice
 * feedback (e.g. hit-hit-miss) is audible as a rhythm, not one aggregate chime.
 * Starting a new sequence (or calling {@link cancelUiSoundSequence}) cancels
 * any previous sequence still scheduled.
 */
export const playUiSoundSequence = (sounds: readonly UiSoundKind[]): void => {
  cancelUiSoundSequence()

  if (sounds.length === 0) {
    return
  }

  const generation = sequenceGeneration

  sounds.forEach((kind, index) => {
    if (index === 0) {
      playOne(kind)
      return
    }

    const timerId = globalThis.setTimeout(() => {
      if (generation !== sequenceGeneration) {
        return
      }

      playOne(kind)
    }, index * UI_SOUND_SEQUENCE_STAGGER_MS)

    sequenceTimers.push(timerId)
  })
}
