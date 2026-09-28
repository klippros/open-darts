import {
  buildMatchWebSocketUrl,
  fetchMatchTicket,
  isPublicMatchState,
  MatchServerApiError,
} from './api'
import { ClientMessageType, MatchCommandName, MatchStatus, ServerMessageType } from './types'

const CANCEL_TIMEOUT_MS = 12_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Opens a short-lived match socket and cancels or leaves a waiting lobby.
 * Active matches cannot be cancelled this way — return to the match instead.
 */
export const cancelOnlineWaitingMatch = async (matchId: string, userId: string): Promise<void> => {
  const ticket = await fetchMatchTicket(matchId)
  const url = buildMatchWebSocketUrl(matchId, ticket.token)

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url)
    let settled = false
    let commandSent = false

    const finish = (error?: Error) => {
      if (settled) {
        return
      }

      settled = true
      window.clearTimeout(timeoutId)

      try {
        ws.close()
      } catch {
        // ignore close errors
      }

      if (error !== undefined) {
        reject(error)
      } else {
        resolve()
      }
    }

    const timeoutId = window.setTimeout(() => {
      finish(new MatchServerApiError('Timed out cancelling online match', 504, 'timeout'))
    }, CANCEL_TIMEOUT_MS)

    ws.addEventListener('error', () => {
      finish(new MatchServerApiError('Unable to connect to online match', 503, 'ws_error'))
    })

    ws.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        return
      }

      let parsed: unknown

      try {
        parsed = JSON.parse(event.data)
      } catch {
        return
      }

      if (!isRecord(parsed)) {
        return
      }

      if (parsed.type === ServerMessageType.Error) {
        const message =
          typeof parsed.message === 'string' ? parsed.message : 'Unable to cancel online match'
        const code = typeof parsed.code === 'string' ? parsed.code : null
        finish(new MatchServerApiError(message, 400, code))
        return
      }

      if (parsed.type !== ServerMessageType.State || !isPublicMatchState(parsed.state)) {
        return
      }

      const state = parsed.state

      if (state.status === MatchStatus.Cancelled) {
        finish()
        return
      }

      if (state.status !== MatchStatus.Waiting) {
        finish(
          new MatchServerApiError(
            'This online match is already in progress. Return to it to finish or leave.',
            409,
            'not_waiting',
          ),
        )
        return
      }

      if (commandSent) {
        return
      }

      commandSent = true
      const commandName =
        state.creatorUserId === userId
          ? MatchCommandName.CancelWaiting
          : MatchCommandName.LeaveWaiting

      ws.send(
        JSON.stringify({
          type: ClientMessageType.Command,
          id: crypto.randomUUID(),
          name: commandName,
        }),
      )
    })
  })
}
