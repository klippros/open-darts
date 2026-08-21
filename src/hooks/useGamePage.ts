import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import {
  getDartPickerHelpContent,
  getGameModePickerTargets,
} from '../lib/game/getGameModePickerTargets'
import { matchHasProgress } from '../lib/game/matchProgress'
import { isVoiceInputSupportedForMode } from '../lib/voice/voiceModeSupport'
import { useAccount } from './accountContext'
import { useSetGameChrome } from './gameChromeContext'
import { useGameFromRoute } from './useGameFromRoute'
import { useScoreCallerInitialLeg, useVisitScoreCaller } from './useVisitScoreCaller'
import { useVoiceRecognition } from './useVoiceRecognition'

export const useGamePage = () => {
  const navigate = useNavigate()
  const { account } = useAccount()
  const [searchParams] = useSearchParams()
  const [abortDialogOpen, setAbortDialogOpen] = useState(false)
  const setGameChrome = useSetGameChrome()
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

  const inputDisabled = game.controller.isComplete || game.loadState.kind === 'conflict'
  const sessionMode = game.controller.session.mode
  const voiceInputAvailable = isVoiceInputSupportedForMode(sessionMode)

  useVoiceRecognition({
    mode: sessionMode,
    sessionId: game.controller.session.id,
    inputDisabled,
    applyControllerTransaction: game.applyControllerTransaction,
  })

  const requestAbortMatch = useCallback(() => {
    setAbortDialogOpen(true)
  }, [])

  const cancelAbortMatch = useCallback(() => {
    setAbortDialogOpen(false)
  }, [])

  const confirmAbortMatch = useCallback(() => {
    clearActiveSnapshot()
    setAbortDialogOpen(false)
    void navigate('/')
  }, [navigate])

  const canFinish = matchHasProgress(game.controller)
  const showMatchActions = !game.controller.isComplete && game.loadState.kind !== 'conflict'
  const pickerTargets = getGameModePickerTargets(
    sessionMode,
    game.controller.engineState,
    game.controller.activePlayerId,
  )
  const help = useMemo(
    () => getDartPickerHelpContent(sessionMode, pickerTargets.bob27TargetIndex),
    [sessionMode, pickerTargets.bob27TargetIndex],
  )

  useEffect(() => {
    if (!showMatchActions) {
      setGameChrome(null)
      return () => {
        setGameChrome(null)
      }
    }

    setGameChrome({
      active: true,
      canFinish,
      voiceInputAvailable,
      onAbort: requestAbortMatch,
      onFinish: game.finishMatch,
      help,
    })

    return () => {
      setGameChrome(null)
    }
  }, [
    showMatchActions,
    canFinish,
    voiceInputAvailable,
    requestAbortMatch,
    game.finishMatch,
    setGameChrome,
    help,
  ])

  return {
    ...game,
    pickerTargets,
    abortDialogOpen,
    cancelAbortMatch,
    confirmAbortMatch,
  }
}
