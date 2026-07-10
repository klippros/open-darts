import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import { createDartThrow } from '../dartScoring'

export const dartFromCheckoutLabel = (label: string, timestamp: string): DartThrow => {
  if (label === 'Bull') {
    return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single, timestamp)
  }

  if (label === '25') {
    return createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single, timestamp)
  }

  if (label.startsWith('T')) {
    const value = Number(label.slice(1))

    return createDartThrow(
      { type: DartSegmentType.Number, value },
      DartMultiplier.Triple,
      timestamp,
    )
  }

  if (label.startsWith('D')) {
    const value = Number(label.slice(1))

    return createDartThrow(
      { type: DartSegmentType.Number, value },
      DartMultiplier.Double,
      timestamp,
    )
  }

  const value = Number(label)

  return createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Single, timestamp)
}

export const createMissDart = (timestamp: string): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss, timestamp)

export const createSingleDart = (value: number, timestamp: string): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Single, timestamp)

export const createTripleDart = (value: number, timestamp: string): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Triple, timestamp)

export const createDoubleDart = (value: number, timestamp: string): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Double, timestamp)
