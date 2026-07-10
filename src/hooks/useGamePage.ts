import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { useAccount } from './accountContext'
import { useBotTurn } from './useBotTurn'
import { isBotTurn } from '../lib/bots/generateBotDart'
import { useGameFromRoute } from './useGameFromRoute'

export const useGamePage = () => {
  const navigate = useNavigate()
  const { account } = useAccount()
  const game = useGameFromRoute({ autoSaveCompletedSessions: account !== null })
  const [abortDialogOpen, setAbortDialogOpen] = useState(false)

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
