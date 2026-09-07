import { isRecord } from '../json'
import { MatchCommandName } from './types'
import type { CommandErrorCode, CommandResult, MatchCommand, PublicMatchState } from './types'

const COMMANDS_BY_NAME: Record<string, MatchCommand> = {
  [MatchCommandName.GetState]: { name: MatchCommandName.GetState },
  [MatchCommandName.Ping]: { name: MatchCommandName.Ping },
  [MatchCommandName.CancelWaiting]: { name: MatchCommandName.CancelWaiting },
}

export const parseMatchCommand = (value: unknown): MatchCommand | null => {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null
  }

  return COMMANDS_BY_NAME[value.name] ?? null
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
