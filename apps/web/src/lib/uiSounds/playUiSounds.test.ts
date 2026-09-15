import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UI_SOUND_SEQUENCE_STAGGER_MS,
  cancelUiSoundSequence,
  playUiSoundSequence,
} from './playUiSounds'

describe('playUiSoundSequence', () => {
  const playMock = vi.fn(() => Promise.resolve())
  let AudioMock: ReturnType<typeof vi.fn>
  let createdUrls: string[]

  beforeEach(() => {
    vi.useFakeTimers()
    createdUrls = []
    playMock.mockClear()
    AudioMock = vi.fn(function FakeAudio(
      this: { volume: number; play: typeof playMock },
      url: string,
    ) {
      createdUrls.push(url)
      this.volume = 1
      this.play = playMock
    })
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('Audio', AudioMock)
  })

  afterEach(() => {
    cancelUiSoundSequence()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('plays the first sound immediately and staggers the rest', () => {
    playUiSoundSequence(['hit', 'hit', 'miss'])

    expect(AudioMock).toHaveBeenCalledTimes(1)
    expect(createdUrls[0]).toContain('hit-chime.mp3')

    vi.advanceTimersByTime(UI_SOUND_SEQUENCE_STAGGER_MS - 1)
    expect(AudioMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(AudioMock).toHaveBeenCalledTimes(2)
    expect(createdUrls[1]).toContain('hit-chime.mp3')

    vi.advanceTimersByTime(UI_SOUND_SEQUENCE_STAGGER_MS)
    expect(AudioMock).toHaveBeenCalledTimes(3)
    expect(createdUrls[2]).toContain('miss-swoosh.mp3')
  })

  it('cancels a pending sequence when a new one starts', () => {
    playUiSoundSequence(['hit', 'miss', 'miss'])
    expect(AudioMock).toHaveBeenCalledTimes(1)

    playUiSoundSequence(['miss'])
    expect(AudioMock).toHaveBeenCalledTimes(2)
    expect(createdUrls[1]).toContain('miss-swoosh.mp3')

    vi.advanceTimersByTime(UI_SOUND_SEQUENCE_STAGGER_MS * 3)
    expect(AudioMock).toHaveBeenCalledTimes(2)
  })

  it('cancels a pending sequence via cancelUiSoundSequence', () => {
    playUiSoundSequence(['hit', 'miss'])
    expect(AudioMock).toHaveBeenCalledTimes(1)

    cancelUiSoundSequence()
    vi.advanceTimersByTime(UI_SOUND_SEQUENCE_STAGGER_MS * 2)
    expect(AudioMock).toHaveBeenCalledTimes(1)
  })

  it('does nothing for an empty sequence', () => {
    playUiSoundSequence([])
    expect(AudioMock).not.toHaveBeenCalled()
  })
})
