import { isRecord } from '../json'
import { MatchCommandName } from './types'
import type { CommandErrorCode, CommandResult, MatchCommand, PublicMatchState } from './types'

const SIMPLE_COMMANDS: Record<string, MatchCommand> = {
  [MatchCommandName.GetState]: { name: MatchCommandName.GetState },
  [MatchCommandName.Ping]: { name: MatchCommandName.Ping },
  [MatchCommandName.CancelWaiting]: { name: MatchCommandName.CancelWaiting },
  [MatchCommandName.LeaveWaiting]: { name: MatchCommandName.LeaveWaiting },
  [MatchCommandName.BeginMatch]: { name: MatchCommandName.BeginMatch },
}

export const parseMatchCommand = (value: unknown): MatchCommand | null => {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null
  }

  const simple = SIMPLE_COMMANDS[value.name]

  if (simple !== undefined) {
    return simple
  }

  const kickCommandName: string = MatchCommandName.KickPlayer

  if (value.name === kickCommandName && typeof value.targetUserId === 'string') {
    return { name: MatchCommandName.KickPlayer, targetUserId: value.targetUserId }
  }

  return null
}

export const commandFailure = (code: CommandErrorCode, message: string): CommandResult => ({
  ok: false,
  state: null,
  code,
  message,
})

export const commandSuccess = (state: PublicMatchState): CommandResult => ({
  ok: true,
  state,
  code: null,
  message: null,
})
