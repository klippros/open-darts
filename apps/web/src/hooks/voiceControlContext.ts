import { createContext, useContext } from 'react'
import type { SpeechRecognitionStatus } from '../lib/voice/speechRecognitionController'

export interface VoiceControlContextValue {
  supported: boolean
  enabled: boolean
  status: SpeechRecognitionStatus
  toggle: () => void
  setEnabled: (enabled: boolean) => void
  setStatus: (status: SpeechRecognitionStatus) => void
}

export const VoiceControlContext = createContext<VoiceControlContextValue | null>(null)

export const useVoiceControl = (): VoiceControlContextValue => {
  const value = useContext(VoiceControlContext)

  if (value === null) {
    throw new Error('useVoiceControl must be used within VoiceControlProvider')
  }

  return value
}
