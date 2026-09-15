import { describe, expect, it } from 'vitest'
import { lightenHex } from './lightenHex'

const channelSum = (hex: string): number => {
  const value = hex.slice(1)

  return (
    Number.parseInt(value.slice(0, 2), 16) +
    Number.parseInt(value.slice(2, 4), 16) +
    Number.parseInt(value.slice(4, 6), 16)
  )
}

describe('lightenHex', () => {
  it('lightens hex colors toward white', () => {
    const green = '#2d5a3c'
    const yellow = '#8c7320'
    const red = '#6b2a38'

    expect(channelSum(lightenHex(green))).toBeGreaterThan(channelSum(green))
    expect(channelSum(lightenHex(yellow))).toBeGreaterThan(channelSum(yellow))
    expect(channelSum(lightenHex(red))).toBeGreaterThan(channelSum(red))
  })

  it('returns the original fill when the color cannot be parsed', () => {
    expect(lightenHex('rgb(45, 90, 60)')).toBe('rgb(45, 90, 60)')
    expect(lightenHex('#fff')).toBe('#fff')
  })

  it('clamps the lighten amount', () => {
    expect(lightenHex('#000000', 2)).toBe('#ffffff')
    expect(lightenHex('#112233', -1)).toBe('#112233')
  })
})
