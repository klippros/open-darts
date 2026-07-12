import { getVisitHistoryEntryDisplay } from '../../components/Scoreboard/visitHistoryDisplay'
import type { GameSession } from '../../types/gameSession'
import { GameModeId } from '../../types/gameMode'
import type { Visit } from '../../types/visit'
import { isMatchComplete } from '../game/matchLegs'
import { capitalizeCallout, numberToWords } from './numberToWords'

export interface VisitEndCalloutContext {
  isMatchComplete: boolean
}

export const buildVisitEndCallout = (
  visit: Visit,
  session: GameSession,
  context: VisitEndCalloutContext,
): string | null => {
  const { mode } = session

  if (mode === GameModeId.X01) {
    if (visit.checkout) {
      if (context.isMatchComplete) {
        return 'Game shot! And the match!'
      }

      return 'Game shot!'
    }

    if (visit.bust || visit.visitScore === 0) {
      return 'No score.'
    }

    return capitalizeCallout(`${numberToWords(visit.visitScore)}.`)
  }

  if (mode === GameModeId.OneTwentyOne || mode === GameModeId.TenUpOneDown) {
    if (visit.checkout) {
      return 'Game shot!'
    }

    return 'No score.'
  }

  const display = getVisitHistoryEntryDisplay(visit, mode)

  if (display.tone === 'failed') {
    return 'No score.'
  }

  if (visit.checkout) {
    return 'Game shot!'
  }

  const score = Number(display.headline)

  if (!Number.isFinite(score)) {
    return capitalizeCallout(`${display.headline}.`)
  }

  return capitalizeCallout(`${numberToWords(score)}.`)
}

export const createVisitEndCalloutContext = (
  session: GameSession,
  isGameComplete: boolean,
): VisitEndCalloutContext => {
  const { matchProgress, players } = session

  if (
    matchProgress !== undefined &&
    isGameComplete &&
    isMatchComplete(matchProgress, players.length)
  ) {
    return { isMatchComplete: true }
  }

  return { isMatchComplete: false }
}
