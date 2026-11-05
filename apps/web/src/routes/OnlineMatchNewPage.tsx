import { Navigate, useSearchParams } from 'react-router-dom'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { isOnlineMatchMode } from '@open-darts/game/game/onlineMatchSetup'
import { buildX01PresetPath, X01PresetId } from '@open-darts/game/x01/x01Presets'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { buildOnlineSetupPath } from '../lib/matchServer/onlineSetup'

export const OnlineMatchNewPage = () => {
  const [searchParams] = useSearchParams()
  const rawMode = searchParams.get('mode')
  const matchMode = rawMode !== null && isOnlineMatchMode(rawMode) ? rawMode : null

  if (!isOnlineMatchesEnabled || matchMode === null) {
    return <Navigate to="/" replace />
  }

  if (matchMode === GameModeId.ClaimTheBoard) {
    return <Navigate to={buildOnlineSetupPath('/game/claim-the-board/setup')} replace />
  }

  if (matchMode === GameModeId.Hunter) {
    return <Navigate to={buildOnlineSetupPath('/game/hunter/setup')} replace />
  }

  if (matchMode === GameModeId.BullRun) {
    return <Navigate to={buildOnlineSetupPath('/game/bull-run/setup')} replace />
  }

  return <Navigate to={buildOnlineSetupPath(buildX01PresetPath(X01PresetId.FiveOhOne))} replace />
}
