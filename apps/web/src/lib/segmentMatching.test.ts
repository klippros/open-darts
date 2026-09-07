import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { hitsBull, hitsDoubleOnNumber, hitsNumberSegment } from './segmentMatching'
import { bullDart, numberDart } from './testHelpers'

describe('segmentMatching', () => {
  it('detects number segment hits', () => {
    expect(hitsNumberSegment(numberDart(20, DartMultiplier.Triple), 20)).toBe(true)
    expect(hitsNumberSegment(numberDart(20, DartMultiplier.Double), 19)).toBe(false)
  })

  it('detects doubles and bull hits', () => {
    expect(hitsDoubleOnNumber(numberDart(10, DartMultiplier.Double), 10)).toBe(true)
    expect(hitsDoubleOnNumber(numberDart(10, DartMultiplier.Triple), 10)).toBe(false)
    expect(hitsBull(bullDart())).toBe(true)
  })
})
