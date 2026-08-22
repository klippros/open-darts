import type { AppSettings } from '../../types/settings'
import { DEFAULT_APP_SETTINGS, X01InputMode } from '../../types/settings'
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

const readX01InputMode = (value: unknown): X01InputMode => {
  if (value === X01InputMode.Board || value === X01InputMode.VisitScore) {
    return value
  }

  return DEFAULT_APP_SETTINGS.x01InputMode
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
    x01InputMode: readX01InputMode(stored.x01InputMode),
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
