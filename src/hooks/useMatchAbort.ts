import { useContext } from 'react'
import { MatchAbortContext } from '../context/matchAbortContext'

export interface MatchAbortContextValue {
  registerMatch: (state: { hasProgress: boolean; isComplete: boolean }) => void
  unregisterMatch: () => void
}

export const useMatchAbort = (): MatchAbortContextValue => {
  const context = useContext(MatchAbortContext)

  if (context === null) {
    throw new Error('useMatchAbort must be used within MatchAbortProvider')
  }

  return context
}
