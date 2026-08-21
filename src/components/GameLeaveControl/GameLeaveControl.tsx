import { useGameChrome } from '../../hooks/gameChromeContext'
import { LeaveMatchMenu } from '../LeaveMatchMenu/LeaveMatchMenu'

/** Leave-match control while a match is active (abort / finish menu). */
export const GameLeaveControl = () => {
  const gameChrome = useGameChrome()

  if (gameChrome?.active !== true) {
    return null
  }

  const handleAbort = gameChrome.onAbort
  const handleFinish = gameChrome.onFinish

  return (
    <LeaveMatchMenu
      canFinish={gameChrome.canFinish}
      onAbort={handleAbort}
      onFinish={handleFinish}
    />
  )
}
