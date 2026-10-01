import { Navigate, useSearchParams } from 'react-router-dom'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { buildX01PresetPath, X01PresetId } from '@open-darts/game/x01/x01Presets'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { buildOnlineSetupPath } from '../lib/matchServer/onlineSetup'

const parseOnlineMatchMode = (
  raw: string | null,
): GameModeId.X01 | GameModeId.ClaimTheBoard | GameModeId.Hunter | null => {
  if (raw === GameModeId.X01 || raw === GameModeId.ClaimTheBoard || raw === GameModeId.Hunter) {
    return raw
  }

  return null
}

export const OnlineMatchNewPage = () => {
  const [searchParams] = useSearchParams()
  const matchMode = parseOnlineMatchMode(searchParams.get('mode'))

  if (!isOnlineMatchesEnabled || matchMode === null) {
    return <Navigate to="/" replace />
  }

  if (matchMode === GameModeId.ClaimTheBoard) {
    return <Navigate to={buildOnlineSetupPath('/game/claim-the-board/setup')} replace />
  }

  if (matchMode === GameModeId.Hunter) {
    return <Navigate to={buildOnlineSetupPath('/game/hunter/setup')} replace />
  }

  return <Navigate to={buildOnlineSetupPath(buildX01PresetPath(X01PresetId.FiveOhOne))} replace />
}
