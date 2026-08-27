import { playHitChime, playMissSwoosh } from '../lib/uiSounds/playUiSounds'
import { useSettings } from './settingsContext'

export const useUiSounds = () => {
  const { uiSoundsEnabled } = useSettings()

  return {
    playHit: () => {
      if (uiSoundsEnabled) {
        playHitChime()
      }
    },
    playMiss: () => {
      if (uiSoundsEnabled) {
        playMissSwoosh()
      }
    },
  }
}
