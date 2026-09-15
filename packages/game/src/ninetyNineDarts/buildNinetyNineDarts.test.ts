import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import { buildNinetyNineDartsThrow } from './buildNinetyNineDarts'

describe('buildNinetyNineDartsThrow', () => {
  const number20 = { kind: NinetyNineDartsTargetKind.Number, value: 20 } as const
  const bull = { kind: NinetyNineDartsTargetKind.Bull } as const

  it('builds number outcomes on the chosen segment', () => {
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, number20)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 20 },
      multiplier: DartMultiplier.Single,
    })
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, number20)).toMatchObject({
      multiplier: DartMultiplier.Double,
    })
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, number20)).toMatchObject({
      multiplier: DartMultiplier.Triple,
    })
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Miss, number20)).toMatchObject({
      multiplier: DartMultiplier.Miss,
    })
  })

  it('builds bull outcomes as outer and inner bull', () => {
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Single, bull)).toMatchObject({
      segment: { type: DartSegmentType.OuterBull },
      multiplier: DartMultiplier.Single,
    })
    expect(buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Double, bull)).toMatchObject({
      segment: { type: DartSegmentType.Bull },
      multiplier: DartMultiplier.Single,
    })
  })

  it('rejects triple on bull', () => {
    expect(() => buildNinetyNineDartsThrow(NinetyNineDartsOutcome.Triple, bull)).toThrow(
      /Triple is not allowed/u,
    )
  })
})
