import type {
  PlayerProfileStats,
  ProfileAroundTheClockStats,
  ProfileBob27Stats,
  ProfileFiveOhOneStats,
  ProfileNinetyNineDartsStats,
  ProfileStatWindow,
} from '@open-darts/analytics'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const readWindow = (value: unknown): ProfileStatWindow | null => {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.startAt !== 'string' || typeof value.endAt !== 'string') {
    return null
  }
  return { startAt: value.startAt, endAt: value.endAt }
}

const readFiveOhOne = (value: unknown): ProfileFiveOhOneStats | null => {
  if (!isRecord(value)) {
    return null
  }
  const window = readWindow(value.window)
  if (
    window === null ||
    typeof value.legsPlayed !== 'number' ||
    typeof value.dartsThrown !== 'number'
  ) {
    return null
  }
  return {
    window,
    threeDartAverage: readNumber(value.threeDartAverage),
    threeDartAverageUntil170: readNumber(value.threeDartAverageUntil170),
    checkoutPercent: readNumber(value.checkoutPercent),
    legsPlayed: value.legsPlayed,
    legWinRate: readNumber(value.legWinRate),
    dartsThrown: value.dartsThrown,
    bestLegDarts: readNumber(value.bestLegDarts),
    highestCheckout: readNumber(value.highestCheckout),
    highestVisit: readNumber(value.highestVisit),
    thrown180: readNumber(value.thrown180),
  }
}

const readBob27 = (value: unknown): ProfileBob27Stats | null => {
  if (!isRecord(value) || typeof value.sessionsPlayed !== 'number') {
    return null
  }
  const window = readWindow(value.window)
  if (window === null) {
    return null
  }
  return {
    window,
    sessionsPlayed: value.sessionsPlayed,
    avgFinalScore: readNumber(value.avgFinalScore),
    hitRate: readNumber(value.hitRate),
    bestFinalScore: readNumber(value.bestFinalScore),
  }
}

const readNinetyNine = (value: unknown): ProfileNinetyNineDartsStats | null => {
  if (!isRecord(value) || typeof value.sessionsPlayed !== 'number') {
    return null
  }
  const window = readWindow(value.window)
  if (window === null) {
    return null
  }
  return {
    window,
    sessionsPlayed: value.sessionsPlayed,
    avgFinalScore: readNumber(value.avgFinalScore),
    hitRate: readNumber(value.hitRate),
    avgTreblesPerGame: readNumber(value.avgTreblesPerGame),
  }
}

const readAroundTheClock = (value: unknown): ProfileAroundTheClockStats | null => {
  if (!isRecord(value) || typeof value.sessionsPlayed !== 'number') {
    return null
  }
  const window = readWindow(value.window)
  if (window === null) {
    return null
  }
  return {
    window,
    sessionsPlayed: value.sessionsPlayed,
    avgDartsFullRun: readNumber(value.avgDartsFullRun),
    avgDartsPerField: readNumber(value.avgDartsPerField),
    bestDartsFullRun: readNumber(value.bestDartsFullRun),
  }
}

export const parsePlayerProfileStats = (value: unknown): PlayerProfileStats | null => {
  if (!isRecord(value) || value.version !== 1 || typeof value.displayName !== 'string') {
    return null
  }

  return {
    version: 1,
    displayName: value.displayName,
    fiveOhOne: value.fiveOhOne === null ? null : readFiveOhOne(value.fiveOhOne),
    bob27: value.bob27 === null ? null : readBob27(value.bob27),
    ninetyNineDarts: value.ninetyNineDarts === null ? null : readNinetyNine(value.ninetyNineDarts),
    aroundTheClock: value.aroundTheClock === null ? null : readAroundTheClock(value.aroundTheClock),
  }
}
