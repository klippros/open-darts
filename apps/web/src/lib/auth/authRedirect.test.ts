import { afterEach, describe, expect, it } from 'vitest'
import { buildAuthRedirectUrl, resolveAuthReturnPath } from './authRedirect'

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

  it('includes a safe next query when returnTo is set', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'http://localhost:5173' } },
      configurable: true,
    })

    const url = new URL(buildAuthRedirectUrl('/match/join/token'))
    expect(url.origin).toBe('http://localhost:5173')
    expect(url.pathname.endsWith('/auth/callback')).toBe(true)
    expect(url.searchParams.get('next')).toBe('/match/join/token')
  })

  it('omits next when returnTo is unsafe', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'http://localhost:5173' } },
      configurable: true,
    })

    const url = new URL(buildAuthRedirectUrl('https://evil.example'))
    expect(url.searchParams.get('next')).toBeNull()
  })
})
