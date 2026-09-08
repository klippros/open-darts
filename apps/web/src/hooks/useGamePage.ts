import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearActiveSnapshot } from '../lib/storage/gameStore'
import { supportsVisitScoreInput } from '@open-darts/game/game/gameModeDefinitions'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import {
  getDartPickerHelpContent,
  getGameModePickerTargets,
} from '../lib/game/getGameModePickerTargets'
import { matchHasProgress } from '@open-darts/game/game/matchProgress'
import { resolveVisitEntryMode } from '../lib/game/resolveVisitEntryMode'
import { isVoiceInputSupportedForMode } from '../lib/voice/voiceModeSupport'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { useAuth } from './authContext'
import { useSetGameChrome } from './gameChromeContext'
import { useSettings } from './settingsContext'
import { useGameFromRoute } from './useGameFromRoute'
import { useScoreCallerInitialLeg, useVisitScoreCaller } from './useVisitScoreCaller'
import { useVoiceRecognition } from './useVoiceRecognition'

export const useGamePage = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { singleDartScoring } = useSettings()
  const [searchParams] = useSearchParams()
  const [abortDialogOpen, setAbortDialogOpen] = useState(false)
  const [visitEntryModeOverride, setVisitEntryModeOverride] = useState<VisitInputMode | null>(null)
  const setGameChrome = useSetGameChrome()
  const mode = useMemo(
    () => parseGameLaunchParams(searchParams, profile?.displayName).mode,
    [searchParams, profile?.displayName],
  )
  const scoreCallerCallbacks = useVisitScoreCaller(mode)
  const game = useGameFromRoute({
    autoSaveCompletedSessions: true,
    ...scoreCallerCallbacks,
  })

  useScoreCallerInitialLeg(game.controller, game.loadState.kind === 'ready')

  const sessionId = game.controller.session.id
  useEffect(() => {
    setVisitEntryModeOverride(null)
  }, [sessionId])

  const inputDisabled = game.controller.isComplete || game.loadState.kind === 'conflict'
  const sessionMode = game.controller.session.mode
  const activePrimaryScore =
    game.controller.scoreboard.players.find((player) => player.isActive)?.primaryScore ?? 0

  const visitEntryMode = supportsVisitScoreInput(sessionMode)
    ? resolveVisitEntryMode(singleDartScoring, activePrimaryScore, visitEntryModeOverride)
    : VisitInputMode.PerDart

  const setVisitEntryMode = useCallback((next: VisitInputMode) => {
    setVisitEntryModeOverride(next)
  }, [])

  const voiceInputAvailable = isVoiceInputSupportedForMode(sessionMode, { visitEntryMode })

  useVoiceRecognition({
    mode: sessionMode,
    sessionId: game.controller.session.id,
    inputDisabled,
    visitEntryMode,
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
    () => getDartPickerHelpContent(sessionMode, pickerTargets.bob27TargetIndex, visitEntryMode),
    [sessionMode, pickerTargets.bob27TargetIndex, visitEntryMode],
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
      abortLabel: 'Abort match',
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
    visitEntryMode,
    setVisitEntryMode,
    abortDialogOpen,
    cancelAbortMatch,
    confirmAbortMatch,
  }
}
