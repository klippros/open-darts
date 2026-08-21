import { Box, Button, HStack, Stack } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'
import { AroundTheClockDartPicker } from '../components/DartPicker/AroundTheClockDartPicker'
import { Bob27DartPicker } from '../components/DartPicker/Bob27DartPicker'
import { DartPicker } from '../components/DartPicker/DartPicker'
import { GameBoardLayout } from '../components/GameBoardLayout'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useAccount } from '../hooks/accountContext'
import { useGamePage } from '../hooks/useGamePage'
import { isAroundTheClockConfig } from '../lib/game/gameConfigGuards'
import { showsVisitHistory } from '../lib/game/gameModeDefinitions'
import { matchHasProgress } from '../lib/game/matchProgress'
import type { AroundTheClockState } from '../types/aroundTheClock'
import type { Bob27State } from '../types/bob27'
import { GameModeId } from '../types/gameMode'
import { GamePageDialogs } from './GamePageDialogs'

export const GamePage = () => {
  const {
    controller,
    recordDart,
    recordDarts,
    undoDart,
    finishMatch,
    restart,
    loadState,
    startNewGame,
    abortDialogOpen,
    requestAbortMatch,
    cancelAbortMatch,
    confirmAbortMatch,
    resumeSavedGame,
  } = useGamePage()
  const { account, createAccount } = useAccount()

  const inputDisabled = controller.isComplete || loadState.kind === 'conflict'
  const canFinish = matchHasProgress(controller)
  const isAroundTheClock = controller.session.mode === GameModeId.AroundTheClock
  const isBob27 = controller.session.mode === GameModeId.Bob27
  const aroundTheClockState = isAroundTheClock
    ? (controller.engineState as AroundTheClockState)
    : null
  const bob27State = isBob27 ? (controller.engineState as Bob27State) : null
  const committedTargetIndex = aroundTheClockState?.players[controller.activePlayerId]?.targetIndex
  const bob27TargetIndex = bob27State?.players[controller.activePlayerId]?.targetIndex

  return (
    <ContentContainer>
      <GamePageDialogs
        resumeConflictSession={
          loadState.kind === 'conflict' ? loadState.savedSnapshot.session : null
        }
        onResumeSaved={resumeSavedGame}
        onStartNew={startNewGame}
        abortDialogOpen={abortDialogOpen}
        onAbortDialogOpenChange={(open) => {
          if (!open) {
            cancelAbortMatch()
          }
        }}
        onConfirmAbortMatch={confirmAbortMatch}
        showMatchSummary={controller.isComplete}
        completedSession={controller.isComplete ? controller.session : null}
        account={account}
        onPlayAgain={restart}
        onUndoLastDart={undoDart}
        onCreateAccount={createAccount}
      />

      <Box py={{ base: 6, md: 8 }} pb={10}>
        <GameBoardLayout
          players={controller.session.players}
          visits={controller.session.visits}
          mode={controller.session.mode}
          config={controller.session.config}
          currentLeg={controller.session.matchProgress?.currentLeg}
          showVisitHistory={showsVisitHistory(controller.session.mode)}
        >
          <Stack gap={8}>
            <Scoreboard
              mode={controller.session.mode}
              scoreboard={controller.scoreboard}
              pendingDarts={controller.pendingDarts}
              visits={controller.session.visits}
              players={controller.session.players}
              config={controller.session.config}
              matchProgress={controller.session.matchProgress}
            />

            {isAroundTheClock &&
            isAroundTheClockConfig(controller.session.mode, controller.session.config) &&
            committedTargetIndex !== undefined ? (
              <AroundTheClockDartPicker
                committedTargetIndex={committedTargetIndex}
                pendingDarts={controller.pendingDarts}
                config={controller.session.config}
                onDarts={recordDarts}
                onUndo={undoDart}
                inputDisabled={inputDisabled}
              />
            ) : isBob27 && bob27TargetIndex !== undefined ? (
              <Bob27DartPicker
                targetIndex={bob27TargetIndex}
                onDarts={recordDarts}
                onUndo={undoDart}
                inputDisabled={inputDisabled}
              />
            ) : (
              <DartPicker onDart={recordDart} onUndo={undoDart} inputDisabled={inputDisabled} />
            )}

            {!controller.isComplete && loadState.kind !== 'conflict' && (
              <HStack gap={3} w="full" justify="space-between">
                <Button variant="cancel" onClick={requestAbortMatch}>
                  Abort match
                </Button>
                <Button variant="emphasis" disabled={!canFinish} onClick={finishMatch}>
                  Finish
                </Button>
              </HStack>
            )}
          </Stack>
        </GameBoardLayout>
      </Box>
    </ContentContainer>
  )
}
