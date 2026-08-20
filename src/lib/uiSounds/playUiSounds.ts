const withBaseUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const HIT_SOUND_URL = withBaseUrl('sounds/hit-chime.mp3')
const MISS_SOUND_URL = withBaseUrl('sounds/miss-swoosh.mp3')
const PLAYBACK_VOLUME = 0.7

const playSoundUrl = (url: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  const audio = new Audio(url)
  audio.volume = PLAYBACK_VOLUME
  void audio.play().catch(() => undefined)
}

export const playHitChime = (): void => {
  playSoundUrl(HIT_SOUND_URL)
}

export const playMissSwoosh = (): void => {
  playSoundUrl(MISS_SOUND_URL)
}
