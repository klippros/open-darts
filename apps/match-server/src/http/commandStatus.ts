import { CommandErrorCode } from '../match/types'
import type { CommandResult } from '../match/types'

const STATUS_BY_CODE: Record<CommandErrorCode, number> = {
  [CommandErrorCode.NotFound]: 404,
  [CommandErrorCode.Unauthorized]: 401,
  [CommandErrorCode.Forbidden]: 403,
  [CommandErrorCode.Terminal]: 409,
  [CommandErrorCode.Conflict]: 409,
  [CommandErrorCode.Invalid]: 400,
}

export const httpStatusForCommand = (result: CommandResult): number => {
  if (result.ok) {
    return 200
  }

  if (result.code === null) {
    return 400
  }

  return STATUS_BY_CODE[result.code]
}
