import {
  anyAsyncPendingFinalization,
  asyncPlayerIdsByFinalized,
  autoFinalizeDueAsyncPlayers,
  bothAsyncPlayersFinalized,
  markPendingAsyncPlayersFinalized,
} from './asyncPlay'
import {
  completeAsyncMatch,
  persistCancelled,
  persistCompleted,
  scheduleAsyncFinalizeDeadline,
} from './matchPersist'
import { loadPlayStateJson, writePlayState } from './schema'
import { parsePlayState, playStateToSessionJson } from './sessionPlay'
import { MatchEndingKind } from './types'

export const processAsyncFinalizeAlarm = (sql: SqlStorage, now: number): void => {
  const sessionJson = loadPlayStateJson(sql)

  if (sessionJson === null) {
    return
  }

  const play = autoFinalizeDueAsyncPlayers(parsePlayState(sessionJson), now)

  if (play.asyncPlay !== undefined && bothAsyncPlayersFinalized(play.asyncPlay)) {
    completeAsyncMatch(sql, play, MatchEndingKind.AsyncResult)
    return
  }

  writePlayState(
    sql,
    playStateToSessionJson(play),
    play.turnIndex,
    play.asyncPlay !== undefined && anyAsyncPendingFinalization(play.asyncPlay),
  )
  scheduleAsyncFinalizeDeadline(sql, play)
}

export const resolveAsyncDeadline = (sql: SqlStorage, now: number): void => {
  const sessionJson = loadPlayStateJson(sql)

  if (sessionJson === null) {
    return
  }

  const play = markPendingAsyncPlayersFinalized(parsePlayState(sessionJson))
  const asyncPlay = play.asyncPlay

  if (asyncPlay === undefined) {
    return
  }

  const { finalized, unfinished } = asyncPlayerIdsByFinalized(asyncPlay)

  if (finalized.length === 2) {
    completeAsyncMatch(sql, play, MatchEndingKind.AsyncResult)
    return
  }

  if (finalized.length === 1 && unfinished.length === 1) {
    const winnerUserId = finalized[0]
    const loserUserId = unfinished[0]

    if (winnerUserId === undefined || loserUserId === undefined) {
      return
    }

    sql.exec('UPDATE match_players SET abandoned_at = ? WHERE user_id = ?', now, loserUserId)
    writePlayState(sql, playStateToSessionJson(play), play.turnIndex, false)
    persistCompleted(sql, MatchEndingKind.AsyncTimeout, winnerUserId, {
      session: play.session,
      asyncPlay,
      winnerUserId,
    })
    return
  }

  writePlayState(sql, playStateToSessionJson(play), play.turnIndex, false)
  persistCancelled(sql, MatchEndingKind.MutualCancel)
}
