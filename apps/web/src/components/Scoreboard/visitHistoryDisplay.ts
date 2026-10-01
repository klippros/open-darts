import { GameModeId } from '@open-darts/game/types/gameMode'
import type { Visit } from '@open-darts/game/types/visit'
import { isOneTwentyOneRoundFailedVisit } from '@open-darts/game/oneTwentyOne/oneTwentyOneVisitMetadata'

export type VisitHistoryTone = 'default' | 'success' | 'failed'

export interface VisitHistoryEntryDisplay {
  headline: string
  sublabel?: string
  /** Secondary line under the headline (e.g. hit count). */
  detail?: string
  tone: VisitHistoryTone
}

const isTenUpOneDownMode = (mode: GameModeId): boolean => mode === GameModeId.TenUpOneDown

const isHitCountVisitMode = (mode: GameModeId): boolean =>
  mode === GameModeId.ClaimTheBoard || mode === GameModeId.Bob27

/** Hit-count modes only record how many targets were hit, not dart order. */
export const showsVisitDartBreakdown = (mode: GameModeId): boolean => !isHitCountVisitMode(mode)

const readVisitHitCount = (visit: Visit): number | null => {
  const hitCount = visit.metadata?.hitCount

  if (typeof hitCount === 'number' && Number.isFinite(hitCount) && hitCount >= 0) {
    return hitCount
  }

  return null
}

const readVisitTargetLabel = (visit: Visit): string | null => {
  const targetLabel = visit.metadata?.targetLabel

  return typeof targetLabel === 'string' && targetLabel.trim() !== '' ? targetLabel : null
}

const formatHitCountVisitDetail = (visit: Visit): string | undefined => {
  const hitCount = readVisitHitCount(visit)
  const targetLabel = readVisitTargetLabel(visit)
  const hitsPart = hitCount === null ? null : hitCount === 1 ? '1 hit' : `${hitCount} hits`

  if (hitsPart !== null && targetLabel !== null) {
    return `${targetLabel} (${hitsPart})`
  }

  if (hitsPart !== null) {
    return hitsPart
  }

  if (targetLabel !== null) {
    return targetLabel
  }

  return undefined
}

export const getVisitHistoryEntryDisplay = (
  visit: Visit,
  mode: GameModeId,
): VisitHistoryEntryDisplay => {
  if (isHitCountVisitMode(mode)) {
    const hitCount = readVisitHitCount(visit)
    const detail = formatHitCountVisitDetail(visit)

    return {
      headline: String(visit.visitScore),
      ...(detail === undefined ? {} : { detail }),
      tone: hitCount === 0 ? 'failed' : visit.checkout ? 'success' : 'default',
    }
  }

  if (mode === GameModeId.OneTwentyOne) {
    if (visit.checkout) {
      const roundTargetAfter = visit.metadata?.roundTargetAfter

      return {
        headline: String(
          typeof roundTargetAfter === 'number' ? roundTargetAfter : visit.scoreAfter,
        ),
        tone: 'success',
      }
    }

    if (isOneTwentyOneRoundFailedVisit(visit)) {
      return {
        headline: String(visit.scoreAfter),
        sublabel: 'Lost life',
        tone: 'failed',
      }
    }

    if (visit.bust) {
      return {
        headline: 'BUST',
        tone: 'failed',
      }
    }

    return {
      headline: String(visit.visitScore),
      tone: 'default',
    }
  }

  if (mode === GameModeId.Hunter) {
    const fieldAfter = visit.metadata?.fieldNumberAfter
    const advances = visit.metadata?.advances
    const detail =
      typeof advances === 'number' ? `${advances} advance${advances === 1 ? '' : 's'}` : undefined

    return {
      headline: String(typeof fieldAfter === 'number' ? fieldAfter : visit.scoreAfter),
      ...(detail === undefined ? {} : { detail }),
      tone: visit.checkout ? 'success' : visit.visitScore === 0 ? 'failed' : 'default',
    }
  }

  if (isTenUpOneDownMode(mode)) {
    if (visit.checkout) {
      return {
        headline: String(visit.scoreAfter),
        tone: 'success',
      }
    }

    return {
      headline: String(visit.scoreBefore),
      sublabel: 'Failed',
      tone: 'failed',
    }
  }

  if (visit.bust) {
    return {
      headline: 'BUST',
      tone: 'failed',
    }
  }

  return {
    headline: String(visit.visitScore),
    tone: 'default',
  }
}

const HEADLINE_COLORS: Record<VisitHistoryTone, string> = {
  default: 'white',
  success: 'white',
  failed: 'red.300',
}

export const getVisitHistoryHeadlineColor = (tone: VisitHistoryTone): string =>
  HEADLINE_COLORS[tone]
