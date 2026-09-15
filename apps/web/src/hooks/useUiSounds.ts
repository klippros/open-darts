import {
  cancelUiSoundSequence,
  playHitChime,
  playMissSwoosh,
  playUiSoundSequence,
  playUndoChime,
} from '../lib/uiSounds/playUiSounds'
import type { UiSoundKind } from '../lib/uiSounds/playUiSounds'
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
    playUndo: () => {
      if (uiSoundsEnabled) {
        cancelUiSoundSequence()
        playUndoChime()
      }
    },
    playSequence: (sounds: readonly UiSoundKind[]) => {
      if (uiSoundsEnabled) {
        playUiSoundSequence(sounds)
      }
    },
  }
}
