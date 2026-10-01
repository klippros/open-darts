import type { DartThrow } from '@open-darts/game/types/dart'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import { isCountingVisit } from '@open-darts/game/types/visit'
import type { Visit } from '@open-darts/game/types/visit'
import {
  advanceHunterFieldIndex,
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
} from '@open-darts/game/hunter/hunterClock'
import {
  getHunterAdvanceForDart,
  getHunterOutcome,
  isHunterTargetHit,
} from '@open-darts/game/hunter/hunterRules'

export interface HunterPlayerLiveStats {
  hitRate: number | null
  avgAdvancesPerVisit: number | null
  dartsThrown: number
  hits: number
  advances: number
  visitCount: number
}

export interface HunterSingleSessionPlayerStats extends HunterPlayerLiveStats {
  playerId: string
  name: string
}

export interface HunterSingleSessionStats {
  players: HunterSingleSessionPlayerStats[]
}

const advanceFieldNumber = (fieldNumber: number, steps: number): number =>
  getHunterFieldNumber(advanceHunterFieldIndex(getHunterFieldIndexForNumber(fieldNumber), steps))

const getVisitStartFieldNumber = (visit: Visit): number | null => {
  const fromMetadata = visit.metadata?.fieldNumber

  if (typeof fromMetadata === 'number' && Number.isFinite(fromMetadata)) {
    return fromMetadata
  }

  return null
}

const getVisitAdvances = (visit: Visit): number => {
  const fromMetadata = visit.metadata?.advances

  if (typeof fromMetadata === 'number' && Number.isFinite(fromMetadata)) {
    return fromMetadata
  }

  return visit.visitScore
}

export const computeHunterPlayerStats = (
  visits: Visit[],
  playerId: string,
): HunterPlayerLiveStats => {
  let dartsThrown = 0
  let hits = 0
  let advances = 0
  let visitCount = 0

  for (const visit of visits) {
    if (!isCountingVisit(visit) || visit.playerId !== playerId) {
      continue
    }

    visitCount += 1
    advances += getVisitAdvances(visit)

    const startField = getVisitStartFieldNumber(visit)

    if (startField === null) {
      dartsThrown += visit.darts.length
      continue
    }

    let fieldNumber = startField

    for (const dart of visit.darts) {
      dartsThrown += 1

      if (isHunterTargetHit(dart, fieldNumber)) {
        hits += 1
      }

      const step = getHunterAdvanceForDart(dart, fieldNumber)
      fieldNumber = advanceFieldNumber(fieldNumber, step)
    }
  }

  return {
    hitRate: dartsThrown === 0 ? null : (hits / dartsThrown) * 100,
    avgAdvancesPerVisit: visitCount === 0 ? null : advances / visitCount,
    dartsThrown,
    hits,
    advances,
    visitCount,
  }
}

export const computeHunterSingleSessionStats = (
  session: GameSession,
): HunterSingleSessionStats | null => {
  if (session.mode !== GameModeId.Hunter) {
    return null
  }

  return {
    players: session.players.map((player) => ({
      playerId: player.id,
      name: player.name,
      ...computeHunterPlayerStats(session.visits, player.id),
    })),
  }
}

export const HUNTER_OUTCOME_LABELS: Record<HunterOutcome, string> = {
  [HunterOutcome.Miss]: 'Miss',
  [HunterOutcome.Single]: 'Single',
  [HunterOutcome.Double]: 'Double',
  [HunterOutcome.Triple]: 'Triple',
}

export const getHunterThrownOutcome = (dart: DartThrow, fieldNumber: number): HunterOutcome =>
  getHunterOutcome(dart, fieldNumber)
