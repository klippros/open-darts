import { getVisitAverages, getPrimaryPlayerVisits } from '../analytics/visitStats'
import { gameModeDefinitions } from '../game/gameModeDefinitions'
import { isX01Config } from '../game/gameConfigGuards'
import { getMatchWinnerId } from '../game/matchLegs'
import { formatLegWinLine } from '../game/matchLegDisplay'
import { formatX01StartScore } from '../x01/x01Presets'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'

export interface MatchSummary {
  title: string
  details: string[]
}

export const getSessionModeLabel = (session: GameSession): string => {
  if (isX01Config(session.mode, session.config)) {
    return formatX01StartScore(session.config)
  }

  return gameModeDefinitions[session.mode].label
}

export const getMatchSummary = (session: GameSession): MatchSummary => {
  const playerVisits = getPrimaryPlayerVisits(session)
  const visitCount = playerVisits.length
  const playerId = session.players[0]?.id
  const averages = getVisitAverages(session.players, session.visits)
  const average = playerId === undefined ? null : averages[playerId]
  const finishedEarly = session.finishedEarly === true
  const lastVisit = playerVisits.at(-1)

  if (session.mode === GameModeId.X01) {
    const details: string[] = []
    const { matchProgress } = session
    const checkoutVisit = [...session.visits].reverse().find((visit) => visit.checkout)
    const legWinner =
      checkoutVisit === undefined
        ? undefined
        : session.players.find((player) => player.id === checkoutVisit.playerId)
    const matchWinnerId = matchProgress === undefined ? undefined : getMatchWinnerId(session)
    const matchWinner =
      matchWinnerId === undefined
        ? undefined
        : session.players.find((player) => player.id === matchWinnerId)

    if (matchProgress !== undefined) {
      if (session.players.length > 1) {
        details.unshift(formatLegWinLine(session.players, matchProgress))
        details.unshift(
          `${matchProgress.legsToWin} leg${matchProgress.legsToWin === 1 ? '' : 's'} to win`,
        )
      } else {
        details.unshift(`${matchProgress.legsToWin} leg${matchProgress.legsToWin === 1 ? '' : 's'}`)
      }
    }

    if (matchProgress !== undefined && matchWinner !== undefined) {
      details.push(`${matchWinner.name} wins the match`)
    } else if (checkoutVisit?.checkout === true) {
      details.push(`Checked out from ${checkoutVisit.scoreBefore}`)

      if (legWinner !== undefined && session.players.length > 1) {
        details.push(`${legWinner.name} wins the leg`)
      }
    } else if (finishedEarly && lastVisit !== undefined) {
      details.push(`Left on ${lastVisit.scoreAfter}`)
    }

    const humanWon =
      matchWinner?.id === session.players[0]?.id ||
      (matchWinner === undefined &&
        checkoutVisit?.checkout === true &&
        (session.players.length === 1 || legWinner?.id === session.players[0]?.id))

    let title = 'Session complete'

    if (matchWinner !== undefined) {
      title = humanWon ? 'Match won!' : `${matchWinner.name} wins`
    } else if (checkoutVisit?.checkout === true) {
      title = humanWon ? 'Game shot!' : `${legWinner?.name ?? 'Opponent'} wins`
    }

    return {
      title,
      details,
    }
  }

  if (session.mode === GameModeId.Bob27) {
    const finalScore = lastVisit?.scoreAfter
    const details = [`${visitCount} visit${visitCount === 1 ? '' : 's'}`]

    if (finalScore !== undefined) {
      details.push(`Finished on ${finalScore} points`)
    }

    return {
      title: finishedEarly ? "Bob's 27 session ended" : "Bob's 27 complete",
      details,
    }
  }

  if (session.mode === GameModeId.AroundTheClock) {
    const details = [`${visitCount} visit${visitCount === 1 ? '' : 's'}`]

    if (!finishedEarly) {
      details.push('Hit every target through bull')
    }

    return {
      title: finishedEarly ? 'Around the Clock session ended' : 'Around the Clock complete',
      details,
    }
  }

  if (session.mode === GameModeId.OneTwentyOne) {
    const details = [`${visitCount} visit${visitCount === 1 ? '' : 's'}`]

    if (average !== null) {
      details.push(`${average.toFixed(1)} 3-dart average`)
    }

    if (finishedEarly && lastVisit !== undefined) {
      details.push(`Stopped on ${lastVisit.scoreAfter}`)
    }

    return {
      title: '121 session complete',
      details,
    }
  }

  const finalScore = lastVisit?.scoreAfter
  const details = [`${visitCount} visit${visitCount === 1 ? '' : 's'}`]

  if (finalScore !== undefined) {
    details.push(`Stopped on ${finalScore}`)
  }

  return {
    title: finishedEarly ? '10 Up 1 Down session ended' : '10 Up 1 Down complete',
    details,
  }
}

export const getSessionResultSummary = (session: GameSession): string => {
  const summary = getMatchSummary(session)

  return summary.details.join(' · ')
}

export const getSessionCompletedAt = (session: GameSession): string =>
  session.completedAt ?? session.startedAt

export const sortSessionsByDate = (sessions: GameSession[]): GameSession[] =>
  [...sessions]
    .filter((session) => session.status === GameStatus.Completed)
    .sort((left, right) => getSessionCompletedAt(right).localeCompare(getSessionCompletedAt(left)))

export const formatSessionDate = (isoDate: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate))
