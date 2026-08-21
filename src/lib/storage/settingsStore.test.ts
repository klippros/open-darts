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
  it('defaults score caller, UI sounds, and voice isolation', () => {
    const storage = createMemoryStorage()

    expect(loadSettings(storage)).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('saves and loads settings', () => {
    const storage = createMemoryStorage()

    saveSettings(
      { scoreCallerEnabled: false, uiSoundsEnabled: false, voiceIsolationMs: 600 },
      storage,
    )

    expect(loadSettings(storage)).toEqual({
      scoreCallerEnabled: false,
      uiSoundsEnabled: false,
      voiceIsolationMs: 600,
    })
  })

  it('merges legacy stored settings missing newer fields', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Settings, '{"scoreCallerEnabled":false}')

    expect(loadSettings(storage)).toEqual({
      scoreCallerEnabled: false,
      uiSoundsEnabled: true,
      voiceIsolationMs: 400,
    })
  })

  it('clamps out-of-range voice isolation', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      StorageKey.Settings,
      JSON.stringify({
        scoreCallerEnabled: true,
        uiSoundsEnabled: true,
        voiceIsolationMs: 9999,
      }),
    )

    expect(loadSettings(storage).voiceIsolationMs).toBe(1500)
  })

  it('falls back to defaults for invalid stored JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Settings, '{"scoreCallerEnabled":"yes"}')

    expect(loadSettings(storage)).toEqual({
      scoreCallerEnabled: true,
      uiSoundsEnabled: true,
      voiceIsolationMs: 400,
    })
  })

  it('falls back to defaults for non-object JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Settings, '"nope"')

    expect(loadSettings(storage)).toEqual(DEFAULT_APP_SETTINGS)
  })
})
