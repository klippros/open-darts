import { Box, Flex, useBreakpointValue } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'
import { GameModeDartPicker } from '../components/DartPicker/GameModeDartPicker'
import { GameBoardLayout } from '../components/GameBoardLayout'
import { MobileVisitHistory } from '../components/Scoreboard/MobileVisitHistory'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useAccount } from '../hooks/accountContext'
import { useGamePage } from '../hooks/useGamePage'
import { showsVisitHistory } from '../lib/game/gameModeDefinitions'
import { mainContentMaxWidth } from '../layout'
import { GamePageDialogs } from './GamePageDialogs'

export const GamePage = () => {
  const {
    controller,
    recordDart,
    recordDarts,
    undoDart,
    restart,
    loadState,
    startNewGame,
    abortDialogOpen,
    cancelAbortMatch,
    confirmAbortMatch,
    resumeSavedGame,
    pickerTargets,
  } = useGamePage()
  const { account, createAccount } = useAccount()
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? true

  const inputDisabled = controller.isComplete || loadState.kind === 'conflict'

  const dialogs = (
    <GamePageDialogs
      resumeConflictSession={loadState.kind === 'conflict' ? loadState.savedSnapshot.session : null}
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
  )

  const scoreboard = (
    <Scoreboard
      mode={controller.session.mode}
      scoreboard={controller.scoreboard}
      pendingDarts={controller.pendingDarts}
      visits={controller.session.visits}
      players={controller.session.players}
      config={controller.session.config}
      matchProgress={controller.session.matchProgress}
    />
  )

  const picker = (
    <GameModeDartPicker
      mode={controller.session.mode}
      config={controller.session.config}
      aroundTheClockTargetIndex={pickerTargets.aroundTheClockTargetIndex}
      bob27TargetIndex={pickerTargets.bob27TargetIndex}
      pendingDarts={controller.pendingDarts}
      onDart={recordDart}
      onDarts={recordDarts}
      onUndo={undoDart}
      inputDisabled={inputDisabled}
    />
  )

  if (isMobile) {
    const showMobileVisitHistory = showsVisitHistory(controller.session.mode)

    return (
      <Flex direction="column" h="100%" minH={0} w="full" maxW={mainContentMaxWidth} mx="auto">
        {dialogs}
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
          players={controller.session.players}
          visits={controller.session.visits}
          mode={controller.session.mode}
          config={controller.session.config}
          currentLeg={controller.session.matchProgress?.currentLeg}
          showVisitHistory={showsVisitHistory(controller.session.mode)}
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
