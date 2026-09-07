import { DartSegmentType } from '@open-darts/game/types/dart'
import { isRecord } from '../json'
import { parsePublicDartThrows } from './dartPayload'
import { MatchCommandName } from './types'
import type { CommandErrorCode, CommandResult, MatchCommand, PublicMatchState } from './types'

const SIMPLE_COMMANDS: Record<string, MatchCommand> = {
  [MatchCommandName.GetState]: { name: MatchCommandName.GetState },
  [MatchCommandName.Ping]: { name: MatchCommandName.Ping },
  [MatchCommandName.CancelWaiting]: { name: MatchCommandName.CancelWaiting },
  [MatchCommandName.LeaveWaiting]: { name: MatchCommandName.LeaveWaiting },
  [MatchCommandName.BeginMatch]: { name: MatchCommandName.BeginMatch },
  [MatchCommandName.UndoVisit]: { name: MatchCommandName.UndoVisit },
  [MatchCommandName.FinishMatch]: { name: MatchCommandName.FinishMatch },
}

const toPublicDartsFromParsed = (
  darts: NonNullable<ReturnType<typeof parsePublicDartThrows>>,
): MatchCommand & { name: MatchCommandName.RecordVisit } => ({
  name: MatchCommandName.RecordVisit,
  darts: darts.map((dart) => ({
    segment:
      dart.segment.type === DartSegmentType.Number
        ? { type: DartSegmentType.Number, value: dart.segment.value }
        : { type: dart.segment.type },
    multiplier: dart.multiplier,
    points: dart.points,
    timestamp: dart.timestamp,
  })),
})

export const parseMatchCommand = (value: unknown): MatchCommand | null => {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null
  }

  const commandName = value.name
  const simple = SIMPLE_COMMANDS[commandName]

  if (simple !== undefined) {
    return simple
  }

  const kickName: string = MatchCommandName.KickPlayer
  const recordVisitName: string = MatchCommandName.RecordVisit
  const recordVisitScoreName: string = MatchCommandName.RecordVisitScore
  const correctVisitName: string = MatchCommandName.CorrectVisit

  if (commandName === kickName && typeof value.targetUserId === 'string') {
    return { name: MatchCommandName.KickPlayer, targetUserId: value.targetUserId }
  }

  if (commandName === recordVisitName) {
    const darts = parsePublicDartThrows(value.darts)

    if (darts === null) {
      return null
    }

    return toPublicDartsFromParsed(darts)
  }

  if (
    commandName === recordVisitScoreName &&
    typeof value.score === 'number' &&
    Number.isInteger(value.score)
  ) {
    return { name: MatchCommandName.RecordVisitScore, score: value.score }
  }

  if (
    commandName === correctVisitName &&
    typeof value.visitIndex === 'number' &&
    Number.isInteger(value.visitIndex)
  ) {
    if (value.darts !== undefined) {
      const darts = parsePublicDartThrows(value.darts)

      if (darts === null) {
        return null
      }

      return {
        name: MatchCommandName.CorrectVisit,
        visitIndex: value.visitIndex,
        darts: toPublicDartsFromParsed(darts).darts,
      }
    }

    if (typeof value.visitScore === 'number' && Number.isInteger(value.visitScore)) {
      return {
        name: MatchCommandName.CorrectVisit,
        visitIndex: value.visitIndex,
        visitScore: value.visitScore,
      }
    }

    return null
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
