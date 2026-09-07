import { ServerMessageType } from './types'
import type { CommandResult, PublicMatchState } from './types'

export const serializeStateMessage = (state: PublicMatchState, commandId?: string): string =>
  JSON.stringify({
    type: ServerMessageType.State,
    id: commandId,
    state,
  })

export const serializeErrorMessage = (result: CommandResult, commandId?: string): string =>
  JSON.stringify({
    type: ServerMessageType.Error,
    id: commandId,
    code: result.code,
    message: result.message,
  })

export const broadcast = (sockets: WebSocket[], payload: string): void => {
  for (const socket of sockets) {
    try {
      socket.send(payload)
    } catch {
      // Drop sockets that closed between getWebSockets and send.
    }
  }
}
