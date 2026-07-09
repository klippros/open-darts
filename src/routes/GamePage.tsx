import { Box, Button, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { DartPicker } from '../components/DartPicker/DartPicker'
import { GameOver } from '../components/GameOver/GameOver'
import { Scoreboard } from '../components/Scoreboard/Scoreboard'
import { useRegisterMatchAbort } from '../hooks/useRegisterMatchAbort'
import { useX01Game } from '../hooks/useX01Game'
import { mainContentMaxWidth } from '../layout'

const parseStartScore = (value: string | null): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 999) {
    return 501
  }

  return parsed
}

export const GamePage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const startScore = useMemo(() => parseStartScore(searchParams.get('start')), [searchParams])
  const { controller, recordDart, undoDart, restart } = useX01Game(startScore)

  useRegisterMatchAbort(controller)

  const handleAbort = () => {
    void navigate('/')
  }

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 8 }} pb={10}>
        <Stack gap={8} maxW={mainContentMaxWidth} mx="auto">
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
      </Box>
    </ContentContainer>
  )
}
