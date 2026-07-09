import { getVisitAverages } from '../../components/Scoreboard/scoreboardStats'
import { gameModeDefinitions } from '../game/gameModeDefinitions'
import { isX01Config } from '../game/gameConfigGuards'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'

export interface MatchSummary {
  title: string
  details: string[]
}

export const getSessionModeLabel = (session: GameSession): string => {
  if (isX01Config(session.mode, session.config)) {
    return String(session.config.startScore)
  }

  return gameModeDefinitions[session.mode].label
}

const getPrimaryPlayerVisits = (session: GameSession) => {
  const playerId = session.players[0]?.id

  if (playerId === undefined) {
    return session.visits
  }

  return session.visits.filter((visit) => visit.playerId === playerId)
}

const getCheckoutVisit = (playerVisits: Visit[]): Visit | undefined =>
  [...playerVisits].reverse().find((visit) => visit.checkout) ?? playerVisits.at(-1)

export const getMatchSummary = (session: GameSession): MatchSummary => {
  const playerVisits = getPrimaryPlayerVisits(session)
  const visitCount = playerVisits.length
  const playerId = session.players[0]?.id
  const averages = getVisitAverages(session.players, session.visits)
  const average = playerId === undefined ? null : averages[playerId]
  const finishedEarly = session.finishedEarly === true
  const lastVisit = playerVisits.at(-1)

  if (session.mode === GameModeId.X01) {
    const details = [`${visitCount} visit${visitCount === 1 ? '' : 's'}`]

    if (average !== null) {
      details.push(`${average.toFixed(1)} 3-dart average`)
    }

    const checkoutVisit = getCheckoutVisit(playerVisits)

    if (checkoutVisit?.checkout === true) {
      details.push(`Checked out from ${checkoutVisit.scoreBefore}`)
    } else if (finishedEarly && lastVisit !== undefined) {
      details.push(`Left on ${lastVisit.scoreAfter}`)
    }

    return {
      title: checkoutVisit?.checkout === true ? 'Game shot!' : 'Session complete',
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
