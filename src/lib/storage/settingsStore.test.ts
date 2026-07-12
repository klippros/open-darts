import { describe, expect, it } from 'vitest'
import { loadSettings, saveSettings } from './settingsStore'
import type { StorageAdapter } from './localStorageAdapter'
import { StorageKey } from './storageKeys'
import { DEFAULT_APP_SETTINGS } from '../../types/settings'

const createMemoryStorage = (): StorageAdapter & { data: Map<string, string> } => {
  const data = new Map<string, string>()

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe('settingsStore', () => {
  it('defaults score caller to enabled', () => {
    const storage = createMemoryStorage()

    expect(loadSettings(storage)).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('saves and loads settings', () => {
    const storage = createMemoryStorage()

    saveSettings({ scoreCallerEnabled: false }, storage)

    expect(loadSettings(storage)).toEqual({ scoreCallerEnabled: false })
  })

  it('falls back to defaults for invalid stored JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Settings, '{"scoreCallerEnabled":"yes"}')

    expect(loadSettings(storage)).toEqual(DEFAULT_APP_SETTINGS)
  })
})
