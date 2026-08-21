import { useEffect, useState } from 'react'
import { createMicrophoneAnalyser } from '../../lib/voice/microphoneAnalyser'

/** Microphone level 0–1 while `enabled`, independent of SpeechRecognition. */
export const useMicrophoneLevel = (enabled: boolean): number => {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLevel(0)
      return undefined
    }

    let disposed = false
    let raf = 0
    let analyser: Awaited<ReturnType<typeof createMicrophoneAnalyser>> = null

    void (async () => {
      analyser = await createMicrophoneAnalyser()

      if (disposed) {
        analyser?.dispose()
        return
      }

      if (analyser === null) {
        return
      }

      const tick = () => {
        if (disposed || analyser === null) {
          return
        }

        setLevel(analyser.getLevel())
        raf = requestAnimationFrame(tick)
      }

      raf = requestAnimationFrame(tick)
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      analyser?.dispose()
    }
  }, [enabled])

  return level
}
