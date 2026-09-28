import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildAuthRedirectUrl,
  consumeAuthReturnPath,
  resolveAuthReturnPath,
  stashAuthReturnPath,
} from './authRedirect'

describe('resolveAuthReturnPath', () => {
  it('accepts relative app paths', () => {
    expect(resolveAuthReturnPath('/match/join/abc')).toBe('/match/join/abc')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(resolveAuthReturnPath('https://evil.example/phish')).toBeNull()
    expect(resolveAuthReturnPath('//evil.example/phish')).toBeNull()
    expect(resolveAuthReturnPath('match/join')).toBeNull()
  })
})

describe('buildAuthRedirectUrl', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('builds a stable callback URL without a next query', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'http://localhost:5173' } },
      configurable: true,
    })

    const url = new URL(buildAuthRedirectUrl())
    expect(url.origin).toBe('http://localhost:5173')
    expect(url.pathname.endsWith('/auth/callback')).toBe(true)
    expect(url.search).toBe('')
  })
})

describe('stashAuthReturnPath / consumeAuthReturnPath', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => {
          storage.delete(key)
        },
        clear: () => {
          storage.clear()
        },
      },
      configurable: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
  })

  it('round-trips a safe return path', () => {
    stashAuthReturnPath('/match/new')
    expect(consumeAuthReturnPath()).toBe('/match/new')
    expect(consumeAuthReturnPath()).toBeNull()
  })

  it('clears stashed path when returnTo is missing or unsafe', () => {
    sessionStorage.setItem('open-darts:auth-return-to', '/match/new')
    stashAuthReturnPath('https://evil.example')
    expect(consumeAuthReturnPath()).toBeNull()
  })

  it('ignores unsafe values left in storage', () => {
    sessionStorage.setItem('open-darts:auth-return-to', 'https://evil.example')
    expect(consumeAuthReturnPath()).toBeNull()
  })
})
