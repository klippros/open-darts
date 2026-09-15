import { createContext, useContext } from 'react'
import type { DartPickerHelpContent } from '../lib/game/getGameModePickerTargets'

export interface GameChromeState {
  active: boolean
  canFinish: boolean
  /** False when voice scoring is not supported for the active mode. */
  voiceInputAvailable: boolean
  /** Label for the leave/abort action (e.g. "Abort match" vs "Abandon"). */
  abortLabel: string
  onAbort: () => void
  onFinish: () => void
  /** Online only: propose a mutual cancel (no loss). */
  onProposeCancel?: () => void
  help: DartPickerHelpContent
}

export interface GameChromeContextValue {
  chrome: GameChromeState | null
  setChrome: (chrome: GameChromeState | null) => void
}

export const GameChromeContext = createContext<GameChromeContextValue | null>(null)

export const useGameChrome = (): GameChromeState | null => {
  const value = useContext(GameChromeContext)

  if (value === null) {
    throw new Error('useGameChrome must be used within GameChromeProvider')
  }

  return value.chrome
}

export const useSetGameChrome = (): GameChromeContextValue['setChrome'] => {
  const value = useContext(GameChromeContext)

  if (value === null) {
    throw new Error('useSetGameChrome must be used within GameChromeProvider')
  }

  return value.setChrome
}
