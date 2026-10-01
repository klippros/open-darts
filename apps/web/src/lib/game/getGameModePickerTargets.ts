import { GameModeId } from '@open-darts/game/types/gameMode'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { getBob27Target } from '@open-darts/game/bob27/bob27Rules'
import { getClaimTheBoardTarget } from '@open-darts/game/claimTheBoard/claimTheBoardRules'
import { getHunterFieldNumber } from '@open-darts/game/hunter/hunterClock'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { VoiceCommandHelpSection } from '../voice/voiceCommandHelp'
import { getVoiceCommandHelpSection } from '../voice/voiceCommandHelp'

export interface DartPickerHelpContent {
  title: string
  paragraphs: string[]
  voice?: VoiceCommandHelpSection
}

export interface GameModePickerTargets {
  aroundTheClockTargetIndex?: number
  claimTheBoardTargetIndex?: number
  bob27TargetIndex?: number
  hunterFieldNumber?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readPlayerTargetIndex = (engineState: object, playerId: string): number | undefined => {
  if (!('players' in engineState) || !isRecord(engineState.players)) {
    return undefined
  }

  const player = engineState.players[playerId]
  if (!isRecord(player) || typeof player.targetIndex !== 'number') {
    return undefined
  }

  return player.targetIndex
}

const readPlayerFieldIndex = (engineState: object, playerId: string): number | undefined => {
  if (!('players' in engineState) || !isRecord(engineState.players)) {
    return undefined
  }

  const player = engineState.players[playerId]
  if (!isRecord(player) || typeof player.fieldIndex !== 'number') {
    return undefined
  }

  return player.fieldIndex
}

const readSharedTargetIndex = (engineState: object): number | undefined => {
  if (!('sharedTargetIndex' in engineState) || typeof engineState.sharedTargetIndex !== 'number') {
    return undefined
  }

  return engineState.sharedTargetIndex
}

/** Reads mode-specific dart-picker target indices from engine state. */
export const getGameModePickerTargets = (
  mode: GameModeId,
  engineState: unknown,
  activePlayerId: string,
): GameModePickerTargets => {
  if (!isRecord(engineState)) {
    return {}
  }

  if (mode === GameModeId.ClaimTheBoard) {
    return { claimTheBoardTargetIndex: readSharedTargetIndex(engineState) }
  }

  if (mode === GameModeId.Hunter) {
    const fieldIndex = readPlayerFieldIndex(engineState, activePlayerId)

    if (fieldIndex === undefined) {
      return {}
    }

    return { hunterFieldNumber: getHunterFieldNumber(fieldIndex) }
  }

  const targetIndex = readPlayerTargetIndex(engineState, activePlayerId)

  if (mode === GameModeId.AroundTheClock) {
    return { aroundTheClockTargetIndex: targetIndex }
  }

  if (mode === GameModeId.Bob27) {
    return { bob27TargetIndex: targetIndex }
  }

  return {}
}

export const getDartPickerHelpContent = (
  mode: GameModeId,
  targetIndex?: number,
  visitEntryMode: VisitInputMode = VisitInputMode.PerDart,
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): DartPickerHelpContent => {
  const voice = getVoiceCommandHelpSection(mode, { visitEntryMode }) ?? undefined

  if (mode === GameModeId.AroundTheClock) {
    return {
      title: 'How to score',
      paragraphs: [
        'Press the dart you hit on. "No hits" records the remaining darts of this visit as misses.',
      ],
      voice,
    }
  }

  if (mode === GameModeId.ClaimTheBoard) {
    const targetLabel =
      targetIndex === undefined ? 'the target' : getClaimTheBoardTarget(targetIndex, aimMode).label

    return {
      title: 'How to score',
      paragraphs: [
        `Record how many times you hit ${targetLabel}. Each hit scores the face value of that target. A miss keeps the target for the next player.`,
        'Highest score wins when someone hits the finish. On a tie, the player who hits that finishing target wins.',
      ],
      voice,
    }
  }

  if (mode === GameModeId.Bob27) {
    const targetLabel = targetIndex === undefined ? 'the target' : getBob27Target(targetIndex).label

    return {
      title: 'How to score',
      paragraphs: [
        `Record how many times you hit ${targetLabel}. Each hit adds the double score, zero hits subtract it; then the next target starts.`,
      ],
      voice,
    }
  }

  if (mode === GameModeId.NinetyNineDarts) {
    return {
      title: 'How to score',
      paragraphs: [
        'Use the three dart columns left to right. Bottom to top: Miss, Single, Triple, Double (no Triple on bull).',
        'Enter one outcome per dart in order. Undo removes the last dart.',
      ],
      voice,
    }
  }

  if (mode === GameModeId.Hunter) {
    return {
      title: 'How to score',
      paragraphs: [
        'Aim at your current number. Single advances one field, double two, treble three around the board clockwise.',
        'Land on or pass your opponent to win. Use the three dart columns: Miss, Single, Triple, Double.',
      ],
      voice,
    }
  }

  if (mode === GameModeId.TenUpOneDown) {
    if (visitEntryMode === VisitInputMode.VisitScore) {
      return {
        title: 'How to score',
        paragraphs: [
          'Tap Checkout when you check out the target, or Failed when you do not. Undo removes the last visit.',
          'Use the Dart tab to enter each dart on the board and see checkout paths update live.',
        ],
        voice,
      }
    }

    return {
      title: 'How to score',
      paragraphs: [
        'Keyboard: D/T for double/triple, type the segment number, then Space to confirm. B bull, Tab miss, Backspace undo, Esc clear modifier.',
        'Tap the board to score. Center arms double/triple; corners are Bull, 25, Undo, and Miss.',
        'Use the Visit tab for a quick Failed or Checkout instead of entering each dart.',
      ],
      voice,
    }
  }

  if (visitEntryMode === VisitInputMode.VisitScore) {
    return {
      title: 'How to score',
      paragraphs: [
        'Enter the total for your visit (0–180) with the number pad or keyboard, then Enter. Scores above the remaining total bust automatically.',
        'Backspace edits the number, Escape clears it, and Undo removes the last visit.',
        'Use the Dart tab to enter each dart on the board instead.',
      ],
      voice,
    }
  }

  return {
    title: 'How to score',
    paragraphs: [
      'Keyboard: D/T for double/triple, type the segment number, then Space to confirm. B bull, Tab miss, Backspace undo, Esc clear modifier.',
      'Tap the board to score. Center arms double/triple; corners are Bull, 25, Undo, and Miss.',
      'Use the Visit tab to enter a visit total instead.',
    ],
  }
}
