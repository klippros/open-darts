import { createContext, useContext } from 'react'
import type { X01InputMode } from '../types/settings'

export interface SettingsContextValue {
  scoreCallerEnabled: boolean
  setScoreCallerEnabled: (enabled: boolean) => void
  uiSoundsEnabled: boolean
  setUiSoundsEnabled: (enabled: boolean) => void
  x01InputMode: X01InputMode
  setX01InputMode: (mode: X01InputMode) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export const useSettings = (): SettingsContextValue => {
  const value = useContext(SettingsContext)

  if (value === null) {
    throw new Error('useSettings must be used within SettingsProvider')
  }

  return value
}
