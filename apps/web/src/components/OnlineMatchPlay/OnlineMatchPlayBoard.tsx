import { Box, Button, Dialog, Flex, Stack, Text, useBreakpointValue } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { AppGameController } from '@open-darts/game/game/createSession'
import type { DartThrow } from '@open-darts/game/types/dart'
import {
  showsVisitHistory,
  supportsVisitScoreInput,
} from '@open-darts/game/game/gameModeDefinitions'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { ContentContainer } from '../ContentContainer'
import { GameModeDartPicker } from '../DartPicker/GameModeDartPicker'
import { GameBoardLayout } from '../GameBoardLayout'
import { MobileVisitHistory } from '../Scoreboard/MobileVisitHistory'
import { Scoreboard } from '../Scoreboard/Scoreboard'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { MatchSummaryBody } from '../SessionSummary/MatchSummaryBody'
import { MatchSummaryTitle } from '../SessionSummary/MatchSummaryTitle'
import { getMatchSummary } from '../../lib/history/sessionSummary'
import {
  getDartPickerHelpContent,
  getGameModePickerTargets,
} from '../../lib/game/getGameModePickerTargets'
import { resolveVisitEntryMode } from '../../lib/game/resolveVisitEntryMode'
import { mainContentMaxWidth } from '../../layout'
import { dartsToPublicPayload, restoreOnlineController } from '../../lib/matchServer/onlinePlay'
import {
  AmendOwnVisitKind,
  AmendOwnVisitVoiceActionKind,
  buildCorrectVisitDartsCommand,
  buildCorrectVisitScoreCommand,
  canAmendLastOwnVisit,
  canPressOnlineUndo,
  createCorrectionEntryController,
  getLastOwnCountingVisit,
  mergeCorrectionScoreboard,
  remainingDartsAfterPeelingLast,
  resolveAmendOwnVisitKind,
  resolveAmendOwnVisitVoiceAction,
  shouldClearOnlineLocalDraft,
  visitsWithCorrectionRemoved,
} from '../../lib/matchServer/onlineVisitCorrection'
import { canStartAsyncFromInactivity } from '../../lib/matchServer/startAsyncEligibility'
import { DeadlineKind, MatchCommandName, MatchStatus, PlayMode } from '../../lib/matchServer/types'
import type { MatchCommand, PublicMatchState } from '../../lib/matchServer/types'
import { isVoiceInputSupportedForMode } from '../../lib/voice/voiceModeSupport'
import { VoiceIntentKind } from '../../lib/voice/parseVoiceCommand'
import type { VoiceIntent } from '../../lib/voice/parseVoiceCommand'
import { useSetGameChrome } from '../../hooks/gameChromeContext'
import { useSettings } from '../../hooks/settingsContext'
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition'
import { OnlineMatchAsyncPrompt } from './OnlineMatchAsyncPrompt'
import { OnlineMatchCancelBanner } from './OnlineMatchCancelBanner'
import { OnlineMatchFinishPrompt } from './OnlineMatchFinishPrompt'

export interface OnlineMatchPlayBoardProps {
  state: PublicMatchState
  currentUserId: string
  viewerDisplayName: string | null | undefined
  opponentDisplayName: string | null | undefined
  sendCommand: (command: MatchCommand) => void
}

export const OnlineMatchPlayBoard = ({
  state,
  currentUserId,
  viewerDisplayName,
  opponentDisplayName,
  sendCommand,
}: OnlineMatchPlayBoardProps) => {
  const { singleDartScoring } = useSettings()
  const setGameChrome = useSetGameChrome()
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? true
  const [pendingDarts, setPendingDarts] = useState<DartThrow[]>([])
  const [visitEntryModeOverride, setVisitEntryModeOverride] = useState<VisitInputMode | null>(null)
  const [correctingVisitIndex, setCorrectingVisitIndex] = useState<number | null>(null)
  const [correctionStartedEmpty, setCorrectionStartedEmpty] = useState(false)
  const [asyncPromptDismissed, setAsyncPromptDismissed] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [hasFullyUndoneVisitThisTurn, setHasFullyUndoneVisitThisTurn] = useState(false)

  const boardController = useMemo(
    () => restoreOnlineController(state, currentUserId, viewerDisplayName, [], opponentDisplayName),
    [currentUserId, opponentDisplayName, state, viewerDisplayName],
  )

  const opponent = state.players.find((player) => player.userId !== currentUserId)

  const isMyTurn =
    state.status === MatchStatus.Active &&
    !state.pendingFinalization &&
    state.activePlayerId === currentUserId

  const isCorrecting = correctingVisitIndex !== null

  const entryController = useMemo(() => {
    if (boardController === null) {
      return null
    }

    if (correctingVisitIndex !== null) {
      return createCorrectionEntryController(
        boardController.session,
        correctingVisitIndex,
        currentUserId,
        pendingDarts,
      )
    }

    if (!isMyTurn) {
      return boardController
    }

    return restoreOnlineController(
      state,
      currentUserId,
      viewerDisplayName,
      pendingDarts,
      opponentDisplayName,
    )
  }, [
    boardController,
    correctingVisitIndex,
    currentUserId,
    isMyTurn,
    opponentDisplayName,
    pendingDarts,
    state,
    viewerDisplayName,
  ])

  const controller = entryController ?? boardController

  useEffect(() => {
    const visits = boardController?.session.visits ?? []
    const clear = shouldClearOnlineLocalDraft({
      correctingVisitIndex,
      visits,
      matchActive: state.status === MatchStatus.Active,
      pendingFinalization: state.pendingFinalization,
    })

    if (clear) {
      setPendingDarts([])
      setVisitEntryModeOverride(null)
      setCorrectingVisitIndex(null)
      setCorrectionStartedEmpty(false)
    }
  }, [
    boardController?.session.visits,
    correctingVisitIndex,
    state.pendingFinalization,
    state.status,
    state.version,
  ])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const asyncInactivityEligible =
    state.status === MatchStatus.Active &&
    state.playMode === PlayMode.Synchronous &&
    !state.pendingFinalization &&
    canStartAsyncFromInactivity({
      nowMs,
      matchStartedAt: state.startedAt,
      activePlayerId: state.activePlayerId,
      opponent:
        opponent === undefined
          ? null
          : {
              userId: opponent.userId,
              connected: opponent.connected,
              lastSeenAt: opponent.lastSeenAt,
            },
      players: state.players,
    })

  useEffect(() => {
    if (!asyncInactivityEligible) {
      setAsyncPromptDismissed(false)
    }
  }, [asyncInactivityEligible])

  const finalizeDeadline = state.deadlines.find(
    (deadline) => deadline.kind === DeadlineKind.FinalizeAt,
  )
  const secondsLeft =
    finalizeDeadline === undefined
      ? null
      : Math.max(0, Math.ceil((finalizeDeadline.fireAt - nowMs) / 1000))

  const lastOwnVisit =
    boardController === null
      ? undefined
      : getLastOwnCountingVisit(boardController.session.visits, currentUserId)

  const canAmendLastVisit = canAmendLastOwnVisit({
    isActiveMatch: state.status === MatchStatus.Active,
    pendingFinalization: state.pendingFinalization,
    pendingDartCount: pendingDarts.length,
    lastOwnVisit,
    hasFullyUndoneVisitThisTurn,
  })

  const undoAvailable = canPressOnlineUndo({
    pendingDartCount: pendingDarts.length,
    isCorrecting,
    correctionStartedEmpty,
    canAmendLastVisit,
    pendingFinalization: state.pendingFinalization,
    hasLastOwnVisit: lastOwnVisit !== undefined,
  })

  useEffect(() => {
    if (isMyTurn) {
      return
    }

    setHasFullyUndoneVisitThisTurn(false)
  }, [isMyTurn])

  const visitEntryMode =
    controller !== null && supportsVisitScoreInput(controller.session.mode)
      ? resolveVisitEntryMode(
          singleDartScoring,
          controller.scoreboard.players.find((player) => player.isActive)?.primaryScore ?? 0,
          visitEntryModeOverride,
        )
      : VisitInputMode.PerDart

  const finishCorrection = useCallback(() => {
    setCorrectingVisitIndex(null)
    setCorrectionStartedEmpty(false)
    setPendingDarts([])
  }, [])

  const commitCorrectionDarts = useCallback(
    (visitIndex: number, darts: DartThrow[]) => {
      sendCommand(buildCorrectVisitDartsCommand(visitIndex, dartsToPublicPayload(darts)))
      setHasFullyUndoneVisitThisTurn(false)
      finishCorrection()
    },
    [finishCorrection, sendCommand],
  )

  const commitVisit = useCallback(
    (darts: DartThrow[]) => {
      if (correctingVisitIndex !== null) {
        commitCorrectionDarts(correctingVisitIndex, darts)
        return
      }

      sendCommand({
        name: MatchCommandName.RecordVisit,
        darts: dartsToPublicPayload(darts),
      })
      setHasFullyUndoneVisitThisTurn(false)
      setPendingDarts([])
    },
    [commitCorrectionDarts, correctingVisitIndex, sendCommand],
  )

  const recordDart = useCallback(
    (dart: DartThrow) => {
      if (controller === null) {
        return
      }

      if (!isMyTurn && correctingVisitIndex === null) {
        return
      }

      const next = controller.recordDart(dart)

      if (next.session.visits.length > controller.session.visits.length) {
        const committed = next.session.visits[next.session.visits.length - 1]
        if (committed !== undefined) {
          commitVisit(committed.darts)
        }
        return
      }

      setPendingDarts(next.pendingDarts)
    },
    [commitVisit, controller, correctingVisitIndex, isMyTurn],
  )

  const recordDarts = useCallback(
    (darts: DartThrow[]) => {
      darts.forEach((dart) => {
        recordDart(dart)
      })
    },
    [recordDart],
  )

  const recordVisitScore = useCallback(
    (score: number) => {
      if (correctingVisitIndex !== null) {
        sendCommand(buildCorrectVisitScoreCommand(correctingVisitIndex, score))
        setHasFullyUndoneVisitThisTurn(false)
        finishCorrection()
        return
      }

      if (!isMyTurn) {
        return
      }

      sendCommand({ name: MatchCommandName.RecordVisitScore, score })
      setHasFullyUndoneVisitThisTurn(false)
      setPendingDarts([])
    },
    [correctingVisitIndex, finishCorrection, isMyTurn, sendCommand],
  )

  const startCorrection = useCallback((visitIndex: number, seedPending: DartThrow[] = []) => {
    setCorrectingVisitIndex(visitIndex)
    setCorrectionStartedEmpty(seedPending.length === 0)
    setPendingDarts(seedPending)
  }, [])

  const peelLastOwnVisitDart = useCallback(
    (ownVisit: NonNullable<typeof lastOwnVisit>) => {
      const remaining = remainingDartsAfterPeelingLast(ownVisit)
      sendCommand({ name: MatchCommandName.UndoVisit })
      setPendingDarts(remaining)
      // One server visit undo per turn — further undos only peel local pending.
      setHasFullyUndoneVisitThisTurn(true)
    },
    [sendCommand],
  )

  const undo = useCallback(() => {
    if (pendingDarts.length > 0) {
      setPendingDarts((current) => current.slice(0, -1))
      return
    }

    if (correctingVisitIndex !== null) {
      if (correctionStartedEmpty) {
        finishCorrection()
      }
      return
    }

    if (state.pendingFinalization) {
      if (lastOwnVisit !== undefined) {
        peelLastOwnVisitDart(lastOwnVisit)
      }
      return
    }

    if (!canAmendLastVisit || lastOwnVisit === undefined || boardController === null) {
      return
    }

    const kind = resolveAmendOwnVisitKind(
      boardController.session.visits,
      lastOwnVisit,
      currentUserId,
    )

    if (kind === AmendOwnVisitKind.UndoVisit) {
      peelLastOwnVisitDart(lastOwnVisit)
      return
    }

    startCorrection(lastOwnVisit.visitIndex, remainingDartsAfterPeelingLast(lastOwnVisit))
  }, [
    boardController,
    canAmendLastVisit,
    correctingVisitIndex,
    correctionStartedEmpty,
    currentUserId,
    finishCorrection,
    lastOwnVisit,
    peelLastOwnVisitDart,
    pendingDarts.length,
    startCorrection,
    state.pendingFinalization,
  ])

  const tryHandleVoiceIntent = useCallback(
    (intent: VoiceIntent): boolean => {
      if (intent.kind === VoiceIntentKind.Undo) {
        if (!undoAvailable) {
          return true
        }

        undo()
        return true
      }

      if (correctingVisitIndex !== null) {
        return false
      }

      if (canAmendLastVisit && boardController !== null && lastOwnVisit !== undefined) {
        const action = resolveAmendOwnVisitVoiceAction({
          intent,
          visits: boardController.session.visits,
          playerId: currentUserId,
          lastOwnVisit,
        })

        if (action === null) {
          return false
        }

        if (action.kind === AmendOwnVisitVoiceActionKind.UndoVisit) {
          peelLastOwnVisitDart(lastOwnVisit)
          return true
        }

        if (action.kind === AmendOwnVisitVoiceActionKind.EnterCorrection) {
          startCorrection(lastOwnVisit.visitIndex, remainingDartsAfterPeelingLast(lastOwnVisit))
          return true
        }

        sendCommand(buildCorrectVisitScoreCommand(action.visitIndex, action.visitScore))
        setHasFullyUndoneVisitThisTurn(false)
        return true
      }

      return false
    },
    [
      boardController,
      canAmendLastVisit,
      correctingVisitIndex,
      currentUserId,
      lastOwnVisit,
      peelLastOwnVisitDart,
      sendCommand,
      startCorrection,
      undo,
      undoAvailable,
    ],
  )

  const applyControllerTransaction = useCallback(
    (
      updater: (current: AppGameController) => {
        next: AppGameController
        scoreCallerBase?: AppGameController
        didUndo?: boolean
      } | null,
    ): void => {
      if (controller === null) {
        return
      }

      const result = updater(controller)

      if (result === null || result.next === controller) {
        return
      }

      if (result.didUndo === true) {
        undo()
        return
      }

      if (result.next.session.visits.length > controller.session.visits.length) {
        const committed = result.next.session.visits.at(-1)

        if (committed === undefined) {
          return
        }

        if (correctingVisitIndex !== null) {
          if (committed.inputMode === VisitInputMode.VisitScore) {
            sendCommand(buildCorrectVisitScoreCommand(correctingVisitIndex, committed.visitScore))
            setHasFullyUndoneVisitThisTurn(false)
            finishCorrection()
            return
          }

          commitCorrectionDarts(correctingVisitIndex, committed.darts)
          return
        }

        if (committed.inputMode === VisitInputMode.VisitScore) {
          sendCommand({ name: MatchCommandName.RecordVisitScore, score: committed.visitScore })
          setHasFullyUndoneVisitThisTurn(false)
          setPendingDarts([])
          return
        }

        commitVisit(committed.darts)
        return
      }

      setPendingDarts(result.next.pendingDarts)
    },
    [
      commitCorrectionDarts,
      commitVisit,
      controller,
      correctingVisitIndex,
      finishCorrection,
      sendCommand,
      undo,
    ],
  )

  const voiceInputAvailable =
    controller !== null &&
    state.status === MatchStatus.Active &&
    isVoiceInputSupportedForMode(controller.session.mode, { visitEntryMode })

  const inputDisabled =
    state.status !== MatchStatus.Active || state.pendingFinalization || (!isMyTurn && !isCorrecting)

  const undoDisabled = state.status !== MatchStatus.Active || !undoAvailable

  useVoiceRecognition({
    mode: controller?.session.mode ?? state.mode,
    sessionId: state.matchId,
    inputDisabled,
    visitEntryMode,
    applyControllerTransaction,
    tryHandleVoiceIntent,
  })

  const pickerTargets =
    controller === null
      ? { aroundTheClockTargetIndex: 0, bob27TargetIndex: 0 }
      : getGameModePickerTargets(
          controller.session.mode,
          controller.engineState,
          controller.activePlayerId,
        )

  const help = useMemo(
    () =>
      controller === null
        ? { title: 'Online match', paragraphs: [] }
        : getDartPickerHelpContent(
            controller.session.mode,
            pickerTargets.bob27TargetIndex,
            visitEntryMode,
          ),
    [controller, pickerTargets.bob27TargetIndex, visitEntryMode],
  )

  useEffect(() => {
    if (controller === null || state.status !== MatchStatus.Active) {
      setGameChrome(null)
      return () => {
        setGameChrome(null)
      }
    }

    setGameChrome({
      active: true,
      canFinish: state.pendingFinalization,
      voiceInputAvailable,
      abortLabel: 'Abandon',
      onAbort: () => {
        setAbandonOpen(true)
      },
      onFinish: () => {
        sendCommand({ name: MatchCommandName.FinishMatch })
      },
      onProposeCancel:
        state.cancelProposalUserId === null
          ? () => {
              sendCommand({ name: MatchCommandName.ProposeCancel })
            }
          : undefined,
      help,
    })

    return () => {
      setGameChrome(null)
    }
  }, [
    controller,
    help,
    sendCommand,
    setGameChrome,
    state.cancelProposalUserId,
    state.pendingFinalization,
    state.status,
    voiceInputAvailable,
  ])

  const scoreboardController = useMemo(() => {
    if (boardController === null) {
      return null
    }

    if (isCorrecting && entryController !== null && correctingVisitIndex !== null) {
      return {
        session: {
          ...boardController.session,
          visits: visitsWithCorrectionRemoved(boardController.session.visits, correctingVisitIndex),
        },
        scoreboard: mergeCorrectionScoreboard(
          entryController.scoreboard,
          boardController.scoreboard,
          currentUserId,
        ),
        pendingDarts: entryController.pendingDarts,
      }
    }

    // Only attach uncommitted darts while it is still our turn so an opponent
    // amend that steals the turn does not paint our draft onto their column.
    const scoreboardPending = isMyTurn ? pendingDarts : []
    const restored =
      restoreOnlineController(
        state,
        currentUserId,
        viewerDisplayName,
        scoreboardPending,
        opponentDisplayName,
      ) ?? boardController

    return {
      session: restored.session,
      scoreboard: restored.scoreboard,
      pendingDarts: restored.pendingDarts,
    }
  }, [
    boardController,
    correctingVisitIndex,
    currentUserId,
    entryController,
    isCorrecting,
    isMyTurn,
    opponentDisplayName,
    pendingDarts,
    state,
    viewerDisplayName,
  ])

  if (controller === null || boardController === null || scoreboardController === null) {
    return (
      <ContentContainer py={10}>
        <Text color="whiteAlpha.700">Waiting for match session…</Text>
      </ContentContainer>
    )
  }

  const completed = state.status === MatchStatus.Completed
  const summary = completed ? getMatchSummary(boardController.session) : null
  const waitingPlayerId =
    !isMyTurn && !isCorrecting && state.status === MatchStatus.Active && !state.pendingFinalization
      ? state.activePlayerId
      : null

  const scoreboard = (
    <Scoreboard
      mode={scoreboardController.session.mode}
      scoreboard={scoreboardController.scoreboard}
      pendingDarts={scoreboardController.pendingDarts}
      visits={scoreboardController.session.visits}
      players={scoreboardController.session.players}
      config={scoreboardController.session.config}
      matchProgress={scoreboardController.session.matchProgress}
      hideVisitDartSlots={
        visitEntryMode === VisitInputMode.VisitScore &&
        scoreboardController.pendingDarts.length === 0
      }
    />
  )

  const activeCheckoutTarget = controller.scoreboard.players.find(
    (player) => player.isActive,
  )?.primaryScore

  const picker = (
    <GameModeDartPicker
      mode={controller.session.mode}
      config={controller.session.config}
      aroundTheClockTargetIndex={pickerTargets.aroundTheClockTargetIndex}
      bob27TargetIndex={pickerTargets.bob27TargetIndex}
      checkoutTarget={activeCheckoutTarget}
      pendingDarts={controller.pendingDarts}
      visitEntryMode={visitEntryMode}
      onVisitEntryModeChange={setVisitEntryModeOverride}
      onDart={recordDart}
      onDarts={recordDarts}
      onVisitScore={recordVisitScore}
      onUndo={undo}
      inputDisabled={inputDisabled}
      undoDisabled={undoDisabled}
    />
  )

  const dialogs = (
    <>
      <OnlineMatchFinishPrompt
        open={state.pendingFinalization}
        secondsLeft={secondsLeft}
        onFinish={() => {
          sendCommand({ name: MatchCommandName.FinishMatch })
        }}
        onUndo={() => {
          sendCommand({ name: MatchCommandName.UndoVisit })
        }}
      />
      <OnlineMatchAsyncPrompt
        open={asyncInactivityEligible && !asyncPromptDismissed}
        onWait={() => {
          setAsyncPromptDismissed(true)
        }}
        onContinueAsync={() => {
          sendCommand({ name: MatchCommandName.StartAsync })
          setAsyncPromptDismissed(true)
        }}
      />
      <Dialog.Root
        open={abandonOpen}
        onOpenChange={(details) => {
          setAbandonOpen(details.open)
        }}
        placement="center"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg={darkDialogContentProps.bg}
            borderWidth={darkDialogContentProps.borderWidth}
            borderColor={darkDialogContentProps.borderColor}
            color={darkDialogContentProps.color}
            shadow={darkDialogContentProps.shadow}
            w="full"
            maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem' }}
          >
            <Dialog.Header>
              <Dialog.Title color="white">Abandon match?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="whiteAlpha.800" lineHeight="1.55">
                Leaving now counts as a loss for you and a win for your opponent.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Stack direction="row" gap={3} w="full">
                <Button
                  variant="cancel"
                  flex="1"
                  onClick={() => {
                    setAbandonOpen(false)
                  }}
                >
                  Keep playing
                </Button>
                <Button
                  variant="destructive"
                  flex="1"
                  onClick={() => {
                    sendCommand({ name: MatchCommandName.AbandonMatch })
                    setAbandonOpen(false)
                  }}
                >
                  Abandon
                </Button>
              </Stack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
      {completed && summary !== null && (
        <Dialog.Root open placement="center" closeOnInteractOutside={false} closeOnEscape={false}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              bg={darkDialogContentProps.bg}
              borderWidth={darkDialogContentProps.borderWidth}
              borderColor={darkDialogContentProps.borderColor}
              color={darkDialogContentProps.color}
              shadow={darkDialogContentProps.shadow}
              w="full"
              maxW={{ base: 'calc(100vw - 2rem)', sm: '28rem', md: '36rem' }}
            >
              <Dialog.Header>
                <Dialog.Title color="white">
                  <MatchSummaryTitle title={summary.title} />
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <MatchSummaryBody session={boardController.session} />
              </Dialog.Body>
              <Dialog.Footer>
                <Button asChild variant="emphasis" w="full">
                  <RouterLink to="/">Back home</RouterLink>
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      )}
    </>
  )

  const cancelBanner =
    state.status === MatchStatus.Active && state.cancelProposalUserId !== null ? (
      <OnlineMatchCancelBanner
        proposedByYou={state.cancelProposalUserId === currentUserId}
        onWithdraw={() => {
          sendCommand({ name: MatchCommandName.WithdrawCancel })
        }}
        onAccept={() => {
          sendCommand({ name: MatchCommandName.AcceptCancel })
        }}
      />
    ) : null

  if (isMobile) {
    const showMobileVisitHistory = showsVisitHistory(boardController.session.mode)

    return (
      <Flex direction="column" h="100%" minH={0} w="full" maxW={mainContentMaxWidth} mx="auto">
        {dialogs}
        <Box flexShrink={0} px={6} pt={3} pb={showMobileVisitHistory ? 3 : 4}>
          {cancelBanner !== null ? <Box mb={3}>{cancelBanner}</Box> : null}
          {scoreboard}
        </Box>
        {showMobileVisitHistory ? (
          <Box flex="1" minH={0} overflowY="auto" className="hide-scrollbar" px={6}>
            <Box py={4}>
              <MobileVisitHistory
                players={boardController.session.players}
                visits={scoreboardController.session.visits}
                mode={boardController.session.mode}
                config={boardController.session.config}
                currentLeg={boardController.session.matchProgress?.currentLeg}
                waitingPlayerId={waitingPlayerId}
              />
            </Box>
          </Box>
        ) : (
          <Box flex="1" minH={0} />
        )}
        <Box flexShrink={0} px={6} pt={4} pb={4}>
          {picker}
        </Box>
      </Flex>
    )
  }

  return (
    <ContentContainer
      h="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      flex="1"
      overflowY="auto"
      className="hide-scrollbar"
    >
      {dialogs}
      <Flex direction="column" h="100%" minH={0} flex="1" pt={{ base: 3, md: 4 }} pb={10}>
        <GameBoardLayout
          players={boardController.session.players}
          visits={scoreboardController.session.visits}
          mode={boardController.session.mode}
          config={boardController.session.config}
          currentLeg={boardController.session.matchProgress?.currentLeg}
          showVisitHistory={showsVisitHistory(boardController.session.mode)}
          waitingPlayerId={waitingPlayerId}
        >
          <Flex direction="column" justify="space-between" gap={8} flex="1" minH="100%">
            <Box>
              {cancelBanner !== null ? <Box mb={3}>{cancelBanner}</Box> : null}
              {scoreboard}
            </Box>
            {picker}
          </Flex>
        </GameBoardLayout>
      </Flex>
    </ContentContainer>
  )
}
