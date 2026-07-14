import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import { useAccount } from './accountContext'
import { useBotTurn } from './useBotTurn'
import { isBotTurn } from '../lib/bots/generateBotDart'
import { useGameFromRoute } from './useGameFromRoute'
import { useScoreCallerInitialLeg, useVisitScoreCaller } from './useVisitScoreCaller'

export const useGamePage = () => {
  const navigate = useNavigate()
  const { account } = useAccount()
  const [searchParams] = useSearchParams()
  const [abortDialogOpen, setAbortDialogOpen] = useState(false)
  const mode = useMemo(
    () => parseGameLaunchParams(searchParams, account?.displayName).mode,
    [searchParams, account?.displayName],
  )
  const scoreCallerCallbacks = useVisitScoreCaller(mode)
  const game = useGameFromRoute({
    autoSaveCompletedSessions: account !== null,
    ...scoreCallerCallbacks,
  })

  useScoreCallerInitialLeg(game.controller, game.loadState.kind === 'ready')

  useBotTurn({
    controller: game.controller,
    recordDart: game.recordDart,
    enabled: game.loadState.kind === 'ready',
  })

  const requestAbortMatch = () => {
    setAbortDialogOpen(true)
  }

  const cancelAbortMatch = () => {
    setAbortDialogOpen(false)
  }

  const confirmAbortMatch = () => {
    clearActiveSnapshot()
    setAbortDialogOpen(false)
    void navigate('/')
  }

  return {
    ...game,
    botTurnActive: isBotTurn(game.controller),
    abortDialogOpen,
    requestAbortMatch,
    cancelAbortMatch,
    confirmAbortMatch,
  }
}
