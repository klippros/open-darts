const withBaseUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//u, '')}`

const HIT_SOUND_URL = withBaseUrl('sounds/hit-chime.mp3')
const MISS_SOUND_URL = withBaseUrl('sounds/miss-swoosh.mp3')
const PLAYBACK_VOLUME = 0.7

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
