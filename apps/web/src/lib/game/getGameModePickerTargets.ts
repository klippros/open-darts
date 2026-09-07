import { GameModeId } from '@open-darts/game/types/gameMode'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { getBob27Target } from '@open-darts/game/bob27/bob27Rules'
import type { VoiceCommandHelpSection } from '../voice/voiceCommandHelp'
import { getVoiceCommandHelpSection } from '../voice/voiceCommandHelp'

export interface DartPickerHelpContent {
  title: string
  paragraphs: string[]
  voice?: VoiceCommandHelpSection
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

/** Reads mode-specific dart-picker target indices from engine state. */
export const getGameModePickerTargets = (
  mode: GameModeId,
  engineState: unknown,
  activePlayerId: string,
): { aroundTheClockTargetIndex?: number; bob27TargetIndex?: number } => {
  if (!isRecord(engineState)) {
    return {}
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
  bob27TargetIndex?: number,
  visitEntryMode: VisitInputMode = VisitInputMode.PerDart,
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

  if (mode === GameModeId.Bob27) {
    const targetLabel =
      bob27TargetIndex === undefined ? 'the target' : getBob27Target(bob27TargetIndex).label

    return {
      title: 'How to score',
      paragraphs: [
        `Record how many times you hit ${targetLabel}. Each hit adds the double score, zero hits subtract it; then the next target starts.`,
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
