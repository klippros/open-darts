/** Shared hit-target safety for pressable scoring controls. */
export const pressTargetProps = {
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  touchAction: 'manipulation' as const,
}

/** Inner-layer press shrink — keep the parent hit box fixed. */
export const PRESS_SCALE_ACTIVE = 0.94
