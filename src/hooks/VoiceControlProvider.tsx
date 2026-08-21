import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SpeechRecognitionStatus } from '../lib/voice/speechRecognitionController'
import { isSpeechRecognitionSupported } from '../lib/voice/speechRecognitionSupport'
import { VoiceControlContext } from './voiceControlContext'

export const VoiceControlProvider = ({ children }: { children: ReactNode }) => {
  const supported = isSpeechRecognitionSupported()
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')

  const toggle = useCallback(() => {
    if (!supported) {
      return
    }

    setEnabled((current) => !current)
  }, [supported])

  const value = useMemo(
    () => ({
      supported,
      enabled,
      status,
      toggle,
      setEnabled,
      setStatus,
    }),
    [supported, enabled, status, toggle],
  )

  return <VoiceControlContext.Provider value={value}>{children}</VoiceControlContext.Provider>
}
