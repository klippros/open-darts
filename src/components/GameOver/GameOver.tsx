import { Button, Heading, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

export interface GameOverProps {
  onPlayAgain: () => void
}

export const GameOver = ({ onPlayAgain }: GameOverProps) => (
  <Stack
    gap={6}
    p={8}
    borderWidth="1px"
    borderColor="whiteAlpha.300"
    borderRadius="16px"
    bg="blackAlpha.500"
    align="center"
    textAlign="center"
  >
    <Heading size="xl" color="white" fontFamily="Archivo Black, sans-serif">
      Game shot!
    </Heading>
    <Text color="whiteAlpha.800">Nice checkout. Want another leg?</Text>
    <Stack gap={3} w="full" maxW="280px">
      <Button variant="emphasis" w="full" onClick={onPlayAgain}>
        Play again
      </Button>
      <Button asChild variant="cancel" w="full">
        <RouterLink to="/">Back to home</RouterLink>
      </Button>
    </Stack>
  </Stack>
)
