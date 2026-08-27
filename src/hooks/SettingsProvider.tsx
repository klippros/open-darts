import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings } from '../lib/storage/settingsStore'
import type { AppSettings } from '../types/settings'
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
    }),
    [settings.scoreCallerEnabled, settings.uiSoundsEnabled, patchSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
