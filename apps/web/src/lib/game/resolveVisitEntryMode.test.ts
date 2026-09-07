import { describe, expect, it } from 'vitest'
import { SingleDartScoringMode } from '../../types/settings'
import { VisitInputMode } from '../../types/visit'
import { resolveVisitEntryMode } from './resolveVisitEntryMode'

describe('resolveVisitEntryMode', () => {
  it('always uses per-dart when setting is Always', () => {
    expect(resolveVisitEntryMode(SingleDartScoringMode.Always, 501)).toBe(VisitInputMode.PerDart)
    expect(resolveVisitEntryMode(SingleDartScoringMode.Always, 40)).toBe(VisitInputMode.PerDart)
  })

  it('always uses visit score when setting is Never', () => {
    expect(resolveVisitEntryMode(SingleDartScoringMode.Never, 501)).toBe(VisitInputMode.VisitScore)
    expect(resolveVisitEntryMode(SingleDartScoringMode.Never, 40)).toBe(VisitInputMode.VisitScore)
  })

  it('uses visit score above 170 and per-dart at or below under Sub 171', () => {
    expect(resolveVisitEntryMode(SingleDartScoringMode.Sub171, 501)).toBe(VisitInputMode.VisitScore)
    expect(resolveVisitEntryMode(SingleDartScoringMode.Sub171, 171)).toBe(VisitInputMode.VisitScore)
    expect(resolveVisitEntryMode(SingleDartScoringMode.Sub171, 170)).toBe(VisitInputMode.PerDart)
    expect(resolveVisitEntryMode(SingleDartScoringMode.Sub171, 40)).toBe(VisitInputMode.PerDart)
  })

  it('override wins over setting and remaining', () => {
    expect(resolveVisitEntryMode(SingleDartScoringMode.Sub171, 501, VisitInputMode.PerDart)).toBe(
      VisitInputMode.PerDart,
    )
    expect(resolveVisitEntryMode(SingleDartScoringMode.Always, 40, VisitInputMode.VisitScore)).toBe(
      VisitInputMode.VisitScore,
    )
  })
})
