/** Physical dartboard order starting at 1 (clockwise). No bull. */
export const HUNTER_CLOCK_ORDER = [
  1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20,
] as const

export const HUNTER_FIELD_COUNT = HUNTER_CLOCK_ORDER.length

export const HUNTER_STARTER_FIELD = 1
export const HUNTER_SECOND_FIELD = 19

export const getHunterFieldNumber = (fieldIndex: number): number => {
  const value =
    HUNTER_CLOCK_ORDER[
      ((fieldIndex % HUNTER_FIELD_COUNT) + HUNTER_FIELD_COUNT) % HUNTER_FIELD_COUNT
    ]

  if (value === undefined) {
    throw new Error(`Invalid hunter field index: ${fieldIndex}`)
  }

  return value
}

export const getHunterFieldIndexForNumber = (fieldNumber: number): number => {
  const index = HUNTER_CLOCK_ORDER.findIndex((value) => value === fieldNumber)

  if (index < 0) {
    throw new Error(`Invalid hunter field number: ${fieldNumber}`)
  }

  return index
}

/** Clockwise steps from `fromIndex` to `toIndex` on the circle (1–19). Never 0. */
export const getHunterClockwiseDistance = (fromIndex: number, toIndex: number): number => {
  const from = ((fromIndex % HUNTER_FIELD_COUNT) + HUNTER_FIELD_COUNT) % HUNTER_FIELD_COUNT
  const to = ((toIndex % HUNTER_FIELD_COUNT) + HUNTER_FIELD_COUNT) % HUNTER_FIELD_COUNT

  if (from === to) {
    return HUNTER_FIELD_COUNT
  }

  return (to - from + HUNTER_FIELD_COUNT) % HUNTER_FIELD_COUNT
}

export const advanceHunterFieldIndex = (fieldIndex: number, steps: number): number =>
  (((fieldIndex + steps) % HUNTER_FIELD_COUNT) + HUNTER_FIELD_COUNT) % HUNTER_FIELD_COUNT

/** Standing field = one clockwise step before the aim field. */
export const getHunterStandingFieldIndex = (aimFieldIndex: number): number =>
  advanceHunterFieldIndex(aimFieldIndex, -1)

export const getHunterStandingFieldNumber = (aimFieldNumber: number): number =>
  getHunterFieldNumber(getHunterStandingFieldIndex(getHunterFieldIndexForNumber(aimFieldNumber)))

/**
 * True when advancing `steps` from `fromIndex` lands on or passes `opponentIndex`
 * clockwise (steps >= clockwise distance to opponent).
 */
export const doesHunterAdvanceCatch = (
  fromIndex: number,
  opponentIndex: number,
  steps: number,
): boolean => {
  if (steps <= 0) {
    return false
  }

  return steps >= getHunterClockwiseDistance(fromIndex, opponentIndex)
}
