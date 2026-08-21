export interface MicrophoneAnalyser {
  getLevel: () => number
  dispose: () => void
}

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext
}

/**
 * Optional audio-level meter via getUserMedia + AnalyserNode.
 * Failure must not block speech recognition.
 */
export const createMicrophoneAnalyser = async (): Promise<MicrophoneAnalyser | null> => {
  if (typeof navigator === 'undefined' || navigator.mediaDevices?.getUserMedia === undefined) {
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const win = window as WindowWithWebkitAudio
    const AudioContextCtor = window.AudioContext ?? win.webkitAudioContext

    if (AudioContextCtor === undefined) {
      for (const track of stream.getTracks()) {
        track.stop()
      }

      return null
    }

    const context = new AudioContextCtor()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    return {
      getLevel: () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0

        for (const sample of data) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }

        return Math.min(1, Math.sqrt(sum / data.length) * 4)
      },
      dispose: () => {
        for (const track of stream.getTracks()) {
          track.stop()
        }

        void context.close()
      },
    }
  } catch {
    return null
  }
}
