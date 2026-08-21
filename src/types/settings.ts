import { DEFAULT_VOICE_ISOLATION_MS } from '../lib/voice/commandIsolation'

export interface AppSettings {
  scoreCallerEnabled: boolean
  uiSoundsEnabled: boolean
  /** Silence window before/after voice commands and after TTS (ms). */
  voiceIsolationMs: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  scoreCallerEnabled: true,
  uiSoundsEnabled: true,
  voiceIsolationMs: DEFAULT_VOICE_ISOLATION_MS,
}
