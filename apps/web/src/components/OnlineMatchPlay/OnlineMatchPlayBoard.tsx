import { Box, Button, Dialog, Flex, Stack, Text, useBreakpointValue } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import { DeadlineKind, MatchCommandName, MatchStatus, PlayMode } from '../../lib/matchServer/types'
import type { MatchCommand, PublicMatchState } from '../../lib/matchServer/types'
import { useSetGameChrome } from '../../hooks/gameChromeContext'
import { useSettings } from '../../hooks/settingsContext'
import { OnlineMatchAsyncPrompt } from './OnlineMatchAsyncPrompt'
import { OnlineMatchCancelBanner } from './OnlineMatchCancelBanner'
import { OnlineMatchFinishPrompt } from './OnlineMatchFinishPrompt'

export interface OnlineMatchPlayBoardProps {
  state: PublicMatchState
  currentUserId: string
  viewerDisplayName: string | null | undefined
  sendCommand: (command: MatchCommand) => void
}

export const OnlineMatchPlayBoard = ({
  state,
  currentUserId,
  viewerDisplayName,
  sendCommand,
}: OnlineMatchPlayBoardProps) => {
  const { singleDartScoring } = useSettings()
  const setGameChrome = useSetGameChrome()
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? true
  const [pendingDarts, setPendingDarts] = useState<DartThrow[]>([])
  const [visitEntryModeOverride, setVisitEntryModeOverride] = useState<VisitInputMode | null>(null)
  const [asyncPromptDismissed, setAsyncPromptDismissed] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const controller = useMemo(
    () => restoreOnlineController(state, currentUserId, viewerDisplayName, pendingDarts),
    [currentUserId, pendingDarts, state, viewerDisplayName],
  )

  const opponent = state.players.find((player) => player.userId !== currentUserId)

  useEffect(() => {
    setPendingDarts([])
    setVisitEntryModeOverride(null)
  }, [state.version, state.sessionJson])

  useEffect(() => {
    if (opponent?.connected === true) {
      setAsyncPromptDismissed(false)
    }
  }, [opponent?.connected])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const isMyTurn =
    state.status === MatchStatus.Active &&
    !state.pendingFinalization &&
    state.activePlayerId === currentUserId

  const opponentDisconnected =
    state.status === MatchStatus.Active &&
    state.playMode === PlayMode.Synchronous &&
    !state.pendingFinalization &&
    opponent !== undefined &&
    !opponent.connected

  const finalizeDeadline = state.deadlines.find(
    (deadline) => deadline.kind === DeadlineKind.FinalizeAt,
  )
  const secondsLeft =
    finalizeDeadline === undefined
      ? null
      : Math.max(0, Math.ceil((finalizeDeadline.fireAt - nowMs) / 1000))

  const visitEntryMode =
    controller !== null && supportsVisitScoreInput(controller.session.mode)
      ? resolveVisitEntryMode(
          singleDartScoring,
          controller.scoreboard.players.find((player) => player.isActive)?.primaryScore ?? 0,
          visitEntryModeOverride,
        )
      : VisitInputMode.PerDart

  const commitVisit = useCallback(
    (darts: DartThrow[]) => {
      sendCommand({
        name: MatchCommandName.RecordVisit,
        darts: dartsToPublicPayload(darts),
      })
      setPendingDarts([])
    },
    [sendCommand],
  )

  const recordDart = useCallback(
    (dart: DartThrow) => {
      if (!isMyTurn || controller === null) {
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
    [commitVisit, controller, isMyTurn],
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
      if (!isMyTurn) {
        return
      }

      sendCommand({ name: MatchCommandName.RecordVisitScore, score })
      setPendingDarts([])
    },
    [isMyTurn, sendCommand],
  )

  const undo = useCallback(() => {
    if (pendingDarts.length > 0) {
      setPendingDarts((current) => current.slice(0, -1))
      return
    }

    if (state.pendingFinalization || isMyTurn) {
      sendCommand({ name: MatchCommandName.UndoVisit })
    }
  }, [isMyTurn, pendingDarts.length, sendCommand, state.pendingFinalization])

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
      voiceInputAvailable: false,
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
  ])

  if (controller === null) {
    return (
      <ContentContainer py={10}>
        <Text color="whiteAlpha.700">Waiting for match session…</Text>
      </ContentContainer>
    )
  }

  const inputDisabled = !isMyTurn || state.status !== MatchStatus.Active
  const completed = state.status === MatchStatus.Completed
  const summary = completed ? getMatchSummary(controller.session) : null
  const waitingPlayerId =
    !isMyTurn && state.status === MatchStatus.Active && !state.pendingFinalization
      ? state.activePlayerId
      : null

  const scoreboard = (
    <Scoreboard
      mode={controller.session.mode}
      scoreboard={controller.scoreboard}
      pendingDarts={controller.pendingDarts}
      visits={controller.session.visits}
      players={controller.session.players}
      config={controller.session.config}
      matchProgress={controller.session.matchProgress}
      hideVisitDartSlots={
        visitEntryMode === VisitInputMode.VisitScore && controller.pendingDarts.length === 0
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
        open={opponentDisconnected && !asyncPromptDismissed}
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
                  variant="ghost"
                  flex="1"
                  onClick={() => {
                    setAbandonOpen(false)
                  }}
                >
                  Keep playing
                </Button>
                <Button
                  variant="cancel"
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
                <MatchSummaryBody session={controller.session} />
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
    const showMobileVisitHistory = showsVisitHistory(controller.session.mode)

    return (
      <Flex direction="column" h="100%" minH={0} w="full" maxW={mainContentMaxWidth} mx="auto">
        {dialogs}
        {cancelBanner}
        <Box flexShrink={0} px={6} pt={3} pb={showMobileVisitHistory ? 3 : 4}>
          {scoreboard}
        </Box>
        {showMobileVisitHistory ? (
          <Box flex="1" minH={0} overflowY="auto" className="hide-scrollbar" px={6}>
            <Box py={4}>
              <MobileVisitHistory
                players={controller.session.players}
                visits={controller.session.visits}
                mode={controller.session.mode}
                config={controller.session.config}
                currentLeg={controller.session.matchProgress?.currentLeg}
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
      {cancelBanner}
      <Flex direction="column" h="100%" minH={0} flex="1" pt={{ base: 3, md: 4 }} pb={10}>
        <GameBoardLayout
          players={controller.session.players}
          visits={controller.session.visits}
          mode={controller.session.mode}
          config={controller.session.config}
          currentLeg={controller.session.matchProgress?.currentLeg}
          showVisitHistory={showsVisitHistory(controller.session.mode)}
          waitingPlayerId={waitingPlayerId}
        >
          <Flex direction="column" justify="space-between" gap={8} flex="1" minH="100%">
            {scoreboard}
            {picker}
          </Flex>
        </GameBoardLayout>
      </Flex>
    </ContentContainer>
  )
}
