import type { AppGameController } from '../game/createSession'
import { isSoloLegMatch } from '../game/matchLegs'
import { capitalizeCallout, numberToWords } from './numberToWords'

export const buildLegStartCallout = (controller: AppGameController): string | null => {
  const { matchProgress, players } = controller.session

  if (matchProgress === undefined) {
    return null
  }

  const legNumber = numberToWords(matchProgress.currentLeg)

  if (isSoloLegMatch(players.length)) {
    return capitalizeCallout(`Leg ${legNumber}, game on.`)
  }

  const { name: activePlayerName } = controller.activePlayer

  return capitalizeCallout(`Leg ${legNumber}, ${activePlayerName} to throw first, game on.`)
}
