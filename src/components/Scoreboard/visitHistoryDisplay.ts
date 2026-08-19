import { GameModeId } from '../../types/gameMode'
import type { Visit } from '../../types/visit'
import { isOneTwentyOneRoundFailedVisit } from '../../lib/oneTwentyOne/oneTwentyOneVisitMetadata'

export type VisitHistoryTone = 'default' | 'success' | 'failed'

export interface VisitHistoryEntryDisplay {
  headline: string
  sublabel?: string
  tone: VisitHistoryTone
}

const isTenUpOneDownMode = (mode: GameModeId): boolean => mode === GameModeId.TenUpOneDown

export const getVisitHistoryEntryDisplay = (
  visit: Visit,
  mode: GameModeId,
): VisitHistoryEntryDisplay => {
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
