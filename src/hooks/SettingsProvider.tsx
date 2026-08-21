import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings } from '../lib/storage/settingsStore'
import type { AppSettings, X01InputMode } from '../types/settings'
import { SettingsContext } from './settingsContext'

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(() => loadSettings())

  const patchSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      scoreCallerEnabled: settings.scoreCallerEnabled,
      setScoreCallerEnabled: (enabled: boolean) => {
        patchSettings({ scoreCallerEnabled: enabled })
      },
      uiSoundsEnabled: settings.uiSoundsEnabled,
      setUiSoundsEnabled: (enabled: boolean) => {
        patchSettings({ uiSoundsEnabled: enabled })
      },
      x01InputMode: settings.x01InputMode,
      setX01InputMode: (mode: X01InputMode) => {
        patchSettings({ x01InputMode: mode })
      },
    }),
    [settings.scoreCallerEnabled, settings.uiSoundsEnabled, settings.x01InputMode, patchSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
