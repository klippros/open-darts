import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SpeechRecognitionStatus } from '../lib/voice/speechRecognitionController'
import {
  checkLocalSpeechRecognitionAvailability,
  isLocalSpeechRecognitionUsable,
} from '../lib/voice/speechRecognitionSupport'
import { VoiceControlContext } from './voiceControlContext'

export const VoiceControlProvider = ({ children }: { children: ReactNode }) => {
  // Start false so mobile / cloud-only browsers never flash the mic before the probe finishes.
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')

  useEffect(() => {
    let cancelled = false

    const probe = async (): Promise<void> => {
      const availability = await checkLocalSpeechRecognitionAvailability()

      if (cancelled) {
        return
      }

      setSupported(isLocalSpeechRecognitionUsable(availability))
    }

    void probe()

    return () => {
      cancelled = true
    }
  }, [])

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
