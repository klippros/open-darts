import { GameModeId } from '../../types/gameMode'
import type { Visit } from '../../types/visit'

export type VisitHistoryTone = 'default' | 'success' | 'failed'

export interface VisitHistoryEntryDisplay {
  headline: string
  sublabel?: string
  tone: VisitHistoryTone
}

const isCheckoutPracticeMode = (mode: GameModeId): boolean =>
  mode === GameModeId.OneTwentyOne || mode === GameModeId.TenUpOneDown

export const getVisitHistoryEntryDisplay = (
  visit: Visit,
  mode: GameModeId,
): VisitHistoryEntryDisplay => {
  if (isCheckoutPracticeMode(mode)) {
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
