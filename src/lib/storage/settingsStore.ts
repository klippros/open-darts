import type { AppSettings } from '../../types/settings'
import { DEFAULT_APP_SETTINGS } from '../../types/settings'
import { clampVoiceIsolationMs } from '../voice/commandIsolation'
import type { StorageAdapter } from './localStorageAdapter'
import { browserLocalStorage } from './localStorageAdapter'
import { StorageKey } from './storageKeys'

const parseJson = (value: string | null): unknown => {
  if (value === null) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const readBooleanSetting = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const readVoiceIsolationMs = (value: unknown): number => {
  if (typeof value !== 'number') {
    return DEFAULT_APP_SETTINGS.voiceIsolationMs
  }

  return clampVoiceIsolationMs(value)
}

const mergeAppSettings = (value: unknown): AppSettings | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const stored = value as Partial<AppSettings>

  return {
    scoreCallerEnabled: readBooleanSetting(
      stored.scoreCallerEnabled,
      DEFAULT_APP_SETTINGS.scoreCallerEnabled,
    ),
    uiSoundsEnabled: readBooleanSetting(
      stored.uiSoundsEnabled,
      DEFAULT_APP_SETTINGS.uiSoundsEnabled,
    ),
    voiceIsolationMs: readVoiceIsolationMs(stored.voiceIsolationMs),
  }
}

export const loadSettings = (storage: StorageAdapter = browserLocalStorage): AppSettings => {
  const parsed = parseJson(storage.getItem(StorageKey.Settings))
  const merged = mergeAppSettings(parsed)

  return merged ?? DEFAULT_APP_SETTINGS
}

export const saveSettings = (
  settings: AppSettings,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  storage.setItem(StorageKey.Settings, JSON.stringify(settings))
}
