import { GameModeId } from '../../types/gameMode'
import { getBob27Target } from '../bob27/bob27Rules'

export interface DartPickerHelpContent {
  title: string
  paragraphs: string[]
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
): DartPickerHelpContent => {
  if (mode === GameModeId.AroundTheClock) {
    return {
      title: 'How to score',
      paragraphs: [
        'Press the dart you hit on. "Miss all" records the remaining darts of this visit as misses.',
      ],
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
    }
  }

  return {
    title: 'How to score',
    paragraphs: [
      'Keyboard: D/T for double/triple, type the segment number, then Space to confirm. B bull, Tab miss, Backspace undo, Esc clear modifier.',
      'Tap the board to score. Center arms double/triple; corners are Bull, 25, Undo, and Miss.',
    ],
  }
}
