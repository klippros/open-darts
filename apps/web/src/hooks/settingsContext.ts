import { createContext, useContext } from 'react'
import type { SingleDartScoringMode } from '../types/settings'

export interface SettingsContextValue {
  scoreCallerEnabled: boolean
  setScoreCallerEnabled: (enabled: boolean) => void
  uiSoundsEnabled: boolean
  setUiSoundsEnabled: (enabled: boolean) => void
  singleDartScoring: SingleDartScoringMode
  setSingleDartScoring: (mode: SingleDartScoringMode) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export const useSettings = (): SettingsContextValue => {
  const value = useContext(SettingsContext)

  if (value === null) {
    throw new Error('useSettings must be used within SettingsProvider')
  }

  return value
}
