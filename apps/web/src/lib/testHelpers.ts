import { DartMultiplier, DartSegmentType } from '../types/dart'
import { createDartThrow } from './dartScoring'

const FIXED_TIMESTAMP = '2026-01-01T00:00:00.000Z'

export const numberDart = (value: number, multiplier: DartMultiplier) =>
  createDartThrow({ type: DartSegmentType.Number, value }, multiplier, FIXED_TIMESTAMP)

export const outerBullDart = (multiplier: DartMultiplier) =>
  createDartThrow({ type: DartSegmentType.OuterBull }, multiplier, FIXED_TIMESTAMP)

export const bullDart = (multiplier: DartMultiplier = DartMultiplier.Single) =>
  createDartThrow({ type: DartSegmentType.Bull }, multiplier, FIXED_TIMESTAMP)

export const missDart = () =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss, FIXED_TIMESTAMP)

export const defaultX01Config = () => ({
  startScore: 501,
  doubleIn: false,
  doubleOut: true,
})
