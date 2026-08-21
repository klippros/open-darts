import { useGameChrome } from '../../hooks/gameChromeContext'
import { DartPickerHelp } from '../DartPicker/DartPickerHelp'

/** Info control that opens scoring help while a match is active. */
export const GameHelpControl = () => {
  const gameChrome = useGameChrome()

  if (gameChrome?.active !== true) {
    return null
  }

  return <DartPickerHelp {...gameChrome.help} />
}
