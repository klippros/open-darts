import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings } from '../lib/storage/settingsStore'
import { SettingsContext } from './settingsContext'

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(() => loadSettings())

  const setScoreCallerEnabled = useCallback((enabled: boolean) => {
    setSettings({ scoreCallerEnabled: enabled })
    saveSettings({ scoreCallerEnabled: enabled })
  }, [])

  const value = useMemo(
    () => ({
      scoreCallerEnabled: settings.scoreCallerEnabled,
      setScoreCallerEnabled,
    }),
    [settings.scoreCallerEnabled, setScoreCallerEnabled],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
