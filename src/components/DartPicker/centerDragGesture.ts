import type { ArmedMultiplier } from '../../lib/dartKeyboardInput'
import { DartMultiplier } from '../../types/dart'
import type { CenterZone } from './dartboardLayout'

export interface CenterDragReleaseTarget {
  number: number | null
  centerZone: CenterZone | null
}

export type CenterDragAction =
  | { type: 'recordNumber'; value: number; multiplier: DartMultiplier }
  | { type: 'setArmedMultiplier'; multiplier: ArmedMultiplier }

const centerZoneToMultiplier = (zone: CenterZone): ArmedMultiplier =>
  zone === 'double' ? DartMultiplier.Double : DartMultiplier.Triple

export const resolveCenterDragRelease = (
  zone: CenterZone,
  release: CenterDragReleaseTarget,
  armedBeforeCenterPress: ArmedMultiplier,
): CenterDragAction[] => {
  const multiplier = centerZoneToMultiplier(zone)

  if (release.number !== null) {
    return [
      { type: 'recordNumber', value: release.number, multiplier },
      { type: 'setArmedMultiplier', multiplier: DartMultiplier.Single },
    ]
  }

  if (release.centerZone !== zone) {
    return [{ type: 'setArmedMultiplier', multiplier: armedBeforeCenterPress }]
  }

  if (armedBeforeCenterPress === multiplier) {
    return [{ type: 'setArmedMultiplier', multiplier: DartMultiplier.Single }]
  }

  return [{ type: 'setArmedMultiplier', multiplier }]
}
