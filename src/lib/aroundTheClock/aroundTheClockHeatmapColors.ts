import type { AroundTheClockPerTargetStats } from '../analytics/aroundTheClockStats'
import { DARTBOARD_COLORS } from '../../components/DartPicker/dartboardLayout'

// Muted performance tints aligned with the dart picker palette.
const HEATMAP_GREEN = { r: 45, g: 90, b: 60 }
const HEATMAP_YELLOW = { r: 140, g: 115, b: 32 }
const HEATMAP_RED = { r: 107, g: 42, b: 56 }
const HEATMAP_MISSED = DARTBOARD_COLORS.centerRed
export const HEATMAP_BASE_SEGMENT_DARK = DARTBOARD_COLORS.segmentDark
export const HEATMAP_BASE_SEGMENT_LIGHT = DARTBOARD_COLORS.segmentLight
export const HEATMAP_BULL_BASE = DARTBOARD_COLORS.centerRed
export const HEATMAP_SEGMENT_STROKE = DARTBOARD_COLORS.background
export const HEATMAP_BULL_RADIUS = 60
export const HEATMAP_SEGMENT_INNER_RADIUS = HEATMAP_BULL_RADIUS + 4

const toHex = (value: number): string => value.toString(16).padStart(2, '0')

const mixColors = (
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  amount: number,
): string => {
  const ratio = Math.min(1, Math.max(0, amount))

  return `#${toHex(Math.round(from.r + (to.r - from.r) * ratio))}${toHex(Math.round(from.g + (to.g - from.g) * ratio))}${toHex(Math.round(from.b + (to.b - from.b) * ratio))}`
}

const colorToHex = (color: { r: number; g: number; b: number }): string =>
  `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`

export const getHeatmapColorForRatio = (ratio: number): string => {
  if (ratio <= 1) {
    const amount = Math.min(1, Math.max(0, (ratio - 0.5) / 0.5))

    return mixColors(HEATMAP_GREEN, HEATMAP_YELLOW, amount)
  }

  const amount = Math.min(1, Math.max(0, (ratio - 1) / 1))

  return mixColors(HEATMAP_YELLOW, HEATMAP_RED, amount)
}

export const getOverallAvgDartsPerHit = (
  targets: AroundTheClockPerTargetStats[],
): number | null => {
  const values = targets
    .map((target) => target.avgDartsPerHit)
    .filter((value): value is number => value !== null)

  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const getHeatmapPerformanceRatio = (
  avgDartsPerHit: number | null,
  overallAverage: number | null,
): number | null => {
  if (avgDartsPerHit === null || overallAverage === null || overallAverage === 0) {
    return null
  }

  return avgDartsPerHit / overallAverage
}

export const getHeatmapFillColor = (
  target: AroundTheClockPerTargetStats,
  overallAverage: number | null,
  baseFill: string,
): string => {
  if (target.attemptCount > 0 && target.avgDartsPerHit === null) {
    return HEATMAP_MISSED
  }

  const ratio = getHeatmapPerformanceRatio(target.avgDartsPerHit, overallAverage)

  if (ratio === null) {
    return baseFill
  }

  return getHeatmapColorForRatio(ratio)
}

export const HEATMAP_LEGEND_STOPS = [
  { label: 'Better', color: colorToHex(HEATMAP_GREEN) },
  { label: 'Average', color: colorToHex(HEATMAP_YELLOW) },
  { label: 'Worse', color: colorToHex(HEATMAP_RED) },
] as const
