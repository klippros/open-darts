import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpeechRecognitionConstructor } from '../../types/speechRecognition'
import {
  SpeechRecognitionAvailability,
  checkLocalSpeechRecognitionAvailability,
  getSpeechRecognitionConstructor,
  isLocalSpeechRecognitionUsable,
  isSpeechRecognitionSupported,
} from './speechRecognitionSupport'

const clearSpeechGlobals = (): void => {
  Reflect.deleteProperty(globalThis, 'SpeechRecognition')
  Reflect.deleteProperty(globalThis, 'webkitSpeechRecognition')
  Reflect.deleteProperty(globalThis, 'SpeechRecognitionPhrase')
}

afterEach(() => {
  clearSpeechGlobals()
})

describe('speechRecognitionSupport', () => {
  it('reports unsupported when no constructor is present', () => {
    clearSpeechGlobals()
    expect(getSpeechRecognitionConstructor()).toBeNull()
    expect(isSpeechRecognitionSupported()).toBe(false)
  })

  it('finds SpeechRecognition and webkitSpeechRecognition constructors', () => {
    class MockRecognition {}
    Reflect.set(globalThis, 'SpeechRecognition', MockRecognition)
    expect(getSpeechRecognitionConstructor()).toBe(MockRecognition)
    expect(isSpeechRecognitionSupported()).toBe(true)

    clearSpeechGlobals()
    Reflect.set(globalThis, 'webkitSpeechRecognition', MockRecognition)
    expect(getSpeechRecognitionConstructor()).toBe(MockRecognition)
  })

  it('treats only unavailable as unusable for the mic gate', () => {
    expect(isLocalSpeechRecognitionUsable(SpeechRecognitionAvailability.Available)).toBe(true)
    expect(isLocalSpeechRecognitionUsable(SpeechRecognitionAvailability.Downloadable)).toBe(true)
    expect(isLocalSpeechRecognitionUsable(SpeechRecognitionAvailability.Downloading)).toBe(true)
    expect(isLocalSpeechRecognitionUsable(SpeechRecognitionAvailability.Unavailable)).toBe(false)
  })

  it('returns unavailable when available() is missing (cloud-only / mobile)', async () => {
    class MockRecognition {}
    Reflect.set(globalThis, 'SpeechRecognition', MockRecognition)

    await expect(checkLocalSpeechRecognitionAvailability()).resolves.toBe(
      SpeechRecognitionAvailability.Unavailable,
    )
  })

  it('probes on-device English with processLocally and command quality', async () => {
    const available = vi.fn().mockResolvedValue('downloadable')
    const MockRecognition = Object.assign(class {}, {
      available,
    }) as unknown as SpeechRecognitionConstructor
    Reflect.set(globalThis, 'SpeechRecognition', MockRecognition)

    await expect(checkLocalSpeechRecognitionAvailability('en-US')).resolves.toBe(
      SpeechRecognitionAvailability.Downloadable,
    )

    expect(available).toHaveBeenCalledWith({
      langs: ['en-US'],
      processLocally: true,
      quality: 'command',
    })
  })

  it('maps available statuses and unknown values', async () => {
    const available = vi
      .fn()
      .mockResolvedValueOnce('available')
      .mockResolvedValueOnce('downloading')
      .mockResolvedValueOnce('not-a-real-status')
    const MockRecognition = Object.assign(class {}, {
      available,
    }) as unknown as SpeechRecognitionConstructor
    Reflect.set(globalThis, 'SpeechRecognition', MockRecognition)

    await expect(checkLocalSpeechRecognitionAvailability()).resolves.toBe(
      SpeechRecognitionAvailability.Available,
    )
    await expect(checkLocalSpeechRecognitionAvailability()).resolves.toBe(
      SpeechRecognitionAvailability.Downloading,
    )
    await expect(checkLocalSpeechRecognitionAvailability()).resolves.toBe(
      SpeechRecognitionAvailability.Unavailable,
    )
  })

  it('returns unavailable when available() throws', async () => {
    const available = vi.fn().mockRejectedValue(new Error('blocked'))
    const MockRecognition = Object.assign(class {}, {
      available,
    }) as unknown as SpeechRecognitionConstructor
    Reflect.set(globalThis, 'SpeechRecognition', MockRecognition)

    await expect(checkLocalSpeechRecognitionAvailability()).resolves.toBe(
      SpeechRecognitionAvailability.Unavailable,
    )
  })
})
