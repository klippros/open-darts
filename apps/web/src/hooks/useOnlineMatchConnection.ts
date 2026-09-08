import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildMatchWebSocketUrl,
  fetchMatchTicket,
  isPublicMatchState,
} from '../lib/matchServer/api'
import { ClientMessageType, MatchCommandName, ServerMessageType } from '../lib/matchServer/types'
import type { MatchCommand, PublicMatchState, ServerMessage } from '../lib/matchServer/types'
import { shouldAttemptMatchReconnect } from './onlineMatchReconnect'

export enum OnlineMatchConnectionStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

export interface OnlineMatchConnection {
  status: OnlineMatchConnectionStatus
  state: PublicMatchState | null
  error: string | null
  sendCommand: (command: MatchCommand) => void
  reconnect: () => void
}

const RECONNECT_BASE_MS = 750
const RECONNECT_MAX_MS = 8_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toClientMessage = (command: MatchCommand, id: string) => {
  const base = {
    type: ClientMessageType.Command as const,
    id,
    name: command.name,
  }

  if (command.name === MatchCommandName.KickPlayer) {
    return { ...base, targetUserId: command.targetUserId }
  }

  if (command.name === MatchCommandName.RecordVisit) {
    return { ...base, darts: command.darts }
  }

  if (command.name === MatchCommandName.RecordVisitScore) {
    return { ...base, score: command.score }
  }

  if (command.name === MatchCommandName.CorrectVisit) {
    return {
      ...base,
      visitIndex: command.visitIndex,
      ...(command.darts === undefined ? {} : { darts: command.darts }),
      ...(command.visitScore === undefined ? {} : { visitScore: command.visitScore }),
    }
  }

  return base
}

const parseServerMessage = (raw: string): ServerMessage | null => {
  try {
    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed)) {
      return null
    }

    if (parsed.type === ServerMessageType.State && isPublicMatchState(parsed.state)) {
      return {
        type: ServerMessageType.State,
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
        state: parsed.state,
      }
    }

    if (parsed.type === ServerMessageType.Error) {
      return {
        type: ServerMessageType.Error,
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
        code: typeof parsed.code === 'string' ? parsed.code : null,
        message: typeof parsed.message === 'string' ? parsed.message : null,
      }
    }

    return null
  } catch {
    return null
  }
}

export const useOnlineMatchConnection = (matchId: string | undefined): OnlineMatchConnection => {
  const [status, setStatus] = useState<OnlineMatchConnectionStatus>(
    OnlineMatchConnectionStatus.Idle,
  )
  const [state, setState] = useState<PublicMatchState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const stateRef = useRef<PublicMatchState | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const disposedRef = useRef(false)
  const connectGenerationRef = useRef(0)

  const updateState = useCallback((next: PublicMatchState | null) => {
    stateRef.current = next
    setState(next)
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const closeSocket = useCallback(() => {
    const socket = socketRef.current
    socketRef.current = null

    if (socket !== null) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
    }
  }, [])

  const connect = useCallback(async () => {
    if (matchId === undefined || disposedRef.current) {
      return
    }

    const generation = ++connectGenerationRef.current
    clearReconnectTimer()
    closeSocket()
    setStatus((current) =>
      current === OnlineMatchConnectionStatus.Connected ||
      current === OnlineMatchConnectionStatus.Reconnecting
        ? OnlineMatchConnectionStatus.Reconnecting
        : OnlineMatchConnectionStatus.Connecting,
    )
    setError(null)

    try {
      const ticket = await fetchMatchTicket(matchId)

      if (disposedRef.current || generation !== connectGenerationRef.current) {
        return
      }

      const socket = new WebSocket(buildMatchWebSocketUrl(matchId, ticket.token))
      socketRef.current = socket

      socket.onopen = () => {
        if (disposedRef.current || generation !== connectGenerationRef.current) {
          return
        }

        reconnectAttemptRef.current = 0
        setStatus(OnlineMatchConnectionStatus.Connected)
        socket.send(
          JSON.stringify(toClientMessage({ name: MatchCommandName.GetState }, crypto.randomUUID())),
        )
      }

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        const message = parseServerMessage(event.data)

        if (message === null) {
          return
        }

        if (message.type === ServerMessageType.State) {
          updateState(message.state)
          setError(null)
          return
        }

        setError(message.message ?? message.code ?? 'Match command failed')
      }

      socket.onerror = () => {
        if (disposedRef.current || generation !== connectGenerationRef.current) {
          return
        }

        setError('Match connection error')
      }

      socket.onclose = (event) => {
        if (disposedRef.current || generation !== connectGenerationRef.current) {
          return
        }

        socketRef.current = null

        if (!shouldAttemptMatchReconnect(event.code, event.reason, stateRef.current?.status)) {
          setStatus(OnlineMatchConnectionStatus.Connected)
          return
        }

        setStatus(OnlineMatchConnectionStatus.Reconnecting)
        const attempt = reconnectAttemptRef.current
        reconnectAttemptRef.current = attempt + 1
        const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
        reconnectTimerRef.current = window.setTimeout(() => {
          void connect()
        }, delay)
      }
    } catch (connectError) {
      if (disposedRef.current || generation !== connectGenerationRef.current) {
        return
      }

      const message =
        connectError instanceof Error ? connectError.message : 'Unable to connect to match'
      setError(message)

      if (!shouldAttemptMatchReconnect(1006, '', stateRef.current?.status)) {
        setStatus(OnlineMatchConnectionStatus.Connected)
        return
      }

      setStatus(OnlineMatchConnectionStatus.Reconnecting)
      const attempt = reconnectAttemptRef.current
      reconnectAttemptRef.current = attempt + 1
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
      reconnectTimerRef.current = window.setTimeout(() => {
        void connect()
      }, delay)
    }
  }, [clearReconnectTimer, closeSocket, matchId, updateState])

  useEffect(() => {
    disposedRef.current = false

    if (matchId === undefined) {
      setStatus(OnlineMatchConnectionStatus.Idle)
      updateState(null)
      return undefined
    }

    void connect()

    return () => {
      disposedRef.current = true
      clearReconnectTimer()
      closeSocket()
    }
  }, [clearReconnectTimer, closeSocket, connect, matchId, updateState])

  const sendCommand = useCallback((command: MatchCommand) => {
    const socket = socketRef.current

    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      setError('Not connected to match')
      return
    }

    socket.send(JSON.stringify(toClientMessage(command, crypto.randomUUID())))
  }, [])

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0
    void connect()
  }, [connect])

  return {
    status,
    state,
    error,
    sendCommand,
    reconnect,
  }
}
