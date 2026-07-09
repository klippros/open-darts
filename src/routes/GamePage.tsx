import { Box, Button, Stack } from '@chakra-ui/react'
import { AbortMatchDialog } from '../components/AbortMatchDialog/AbortMatchDialog'
import { ContentContainer } from '../components/ContentContainer'
import { DartPicker } from '../components/DartPicker/DartPicker'
import { GameBoardLayout } from '../components/GameBoardLayout'
import { GameOver } from '../components/GameOver/GameOver'
import { ResumeGameDialog } from '../components/ResumeGameDialog/ResumeGameDialog'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useGamePage } from '../hooks/useGamePage'
import { showsVisitHistory } from '../lib/game/gameModeDefinitions'

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

  const inputDisabled = controller.isComplete || loadState.kind === 'conflict'

  return (
    <ContentContainer>
      {loadState.kind === 'conflict' && (
        <ResumeGameDialog
          open
          savedSession={loadState.savedSnapshot.session}
          onResumeSaved={resumeSavedGame}
          onStartNew={startNewGame}
        />
      )}

      <AbortMatchDialog
        open={abortDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelAbortMatch()
          }
        }}
        onConfirm={confirmAbortMatch}
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

            {controller.isComplete && <GameOver onPlayAgain={restart} />}

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
