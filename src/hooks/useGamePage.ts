import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { useAccount } from './accountContext'
import { useGameFromRoute } from './useGameFromRoute'

export const useGamePage = () => {
  const navigate = useNavigate()
  const { account } = useAccount()
  const game = useGameFromRoute({ autoSaveCompletedSessions: account !== null })
  const [abortDialogOpen, setAbortDialogOpen] = useState(false)

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

  const resumeSavedGame = () => {
    if (game.savedGamePath !== null) {
      void navigate(game.savedGamePath)
    }
  }

  return {
    ...game,
    abortDialogOpen,
    requestAbortMatch,
    cancelAbortMatch,
    confirmAbortMatch,
    resumeSavedGame,
  }
}
