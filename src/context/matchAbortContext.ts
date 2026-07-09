import { createContext } from 'react'
import type { MatchAbortContextValue } from '../hooks/useMatchAbort'

export const MatchAbortContext = createContext<MatchAbortContextValue | null>(null)
