import type { AppSettings } from '../../types/settings'
import { DEFAULT_APP_SETTINGS } from '../../types/settings'
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

const isAppSettings = (value: unknown): value is AppSettings => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const settings = value as Partial<AppSettings>

  return typeof settings.scoreCallerEnabled === 'boolean'
}

export const loadSettings = (storage: StorageAdapter = browserLocalStorage): AppSettings => {
  const parsed = parseJson(storage.getItem(StorageKey.Settings))

  if (parsed === null || !isAppSettings(parsed)) {
    return DEFAULT_APP_SETTINGS
  }

  return parsed
}

export const saveSettings = (
  settings: AppSettings,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  storage.setItem(StorageKey.Settings, JSON.stringify(settings))
}
