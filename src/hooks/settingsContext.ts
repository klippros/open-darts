import { createContext, useContext } from 'react'

export interface SettingsContextValue {
  scoreCallerEnabled: boolean
  setScoreCallerEnabled: (enabled: boolean) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export const useSettings = (): SettingsContextValue => {
  const value = useContext(SettingsContext)

  if (value === null) {
    throw new Error('useSettings must be used within SettingsProvider')
  }

  return value
}
