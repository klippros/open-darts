import { Box, Button, Stack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { DartPicker } from '../components/DartPicker/DartPicker'
import { GameBoardLayout } from '../components/GameBoardLayout'
import { GameOver } from '../components/GameOver/GameOver'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useRegisterMatchAbort } from '../hooks/useRegisterMatchAbort'
import { useX01GameFromRoute } from '../hooks/useX01GameFromRoute'

export const GamePage = () => {
  const navigate = useNavigate()
  const { controller, recordDart, undoDart, restart } = useX01GameFromRoute()

  useRegisterMatchAbort(controller)

  const handleAbort = () => {
    void navigate('/')
  }

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 8 }} pb={10}>
        <GameBoardLayout players={controller.session.players} visits={controller.session.visits}>
          <Stack gap={8}>
            <Scoreboard
              scoreboard={controller.scoreboard}
              pendingDarts={controller.pendingDarts}
              visits={controller.session.visits}
              players={controller.session.players}
              config={controller.session.config}
            />

            {controller.isComplete && <GameOver onPlayAgain={restart} />}

            <DartPicker
              onDart={recordDart}
              onUndo={undoDart}
              inputDisabled={controller.isComplete}
            />

            {!controller.isComplete && (
              <Button variant="cancel" alignSelf="flex-start" onClick={handleAbort}>
                Abort match
              </Button>
            )}
          </Stack>
        </GameBoardLayout>
      </Box>
    </ContentContainer>
  )
}
