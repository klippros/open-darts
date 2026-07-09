import { Box, Button, Stack } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'
import { DartPicker } from '../components/DartPicker/DartPicker'
import { GameBoardLayout } from '../components/GameBoardLayout'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useAccount } from '../hooks/accountContext'
import { useGamePage } from '../hooks/useGamePage'
import { showsVisitHistory } from '../lib/game/gameModeDefinitions'
import { GamePageDialogs } from './GamePageDialogs'

export const GamePage = () => {
  const {
    controller,
    recordDart,
    undoDart,
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
            />

            <DartPicker onDart={recordDart} onUndo={undoDart} inputDisabled={inputDisabled} />

            {!controller.isComplete && loadState.kind !== 'conflict' && (
              <Button variant="cancel" alignSelf="flex-start" onClick={requestAbortMatch}>
                Abort match
              </Button>
            )}
          </Stack>
        </GameBoardLayout>
      </Box>
    </ContentContainer>
  )
}
