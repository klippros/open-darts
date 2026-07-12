import { Heading } from '@chakra-ui/react'
import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { formatLegWinScore } from '../../lib/game/matchLegDisplay'

export interface MatchLegScoreProps {
  session: GameSession
}

export const MatchLegScore = ({ session }: MatchLegScoreProps) => {
  if (session.mode !== GameModeId.X01 || session.matchProgress === undefined) {
    return null
  }

  const legScore = formatLegWinScore(session.players, session.matchProgress)

  if (legScore === null) {
    return null
  }

  return (
    <Heading
      size="4xl"
      color="white"
      fontFamily="Archivo Black, sans-serif"
      lineHeight="1"
      textAlign="center"
    >
      {legScore}
    </Heading>
  )
}
