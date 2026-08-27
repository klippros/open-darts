import { GameModeId } from '../../types/gameMode'
import { X01InputMode } from '../../types/settings'

/** Modes where browser speech recognition is reliable enough for scoring. */
const ALWAYS_VOICE_INPUT_MODES = new Set<GameModeId>([GameModeId.Bob27, GameModeId.AroundTheClock])

const VISIT_SCORE_VOICE_MODES = new Set<GameModeId>([
  GameModeId.X01,
  GameModeId.OneTwentyOne,
  GameModeId.TenUpOneDown,
])

export interface VoiceModeSupportOptions {
  x01InputMode?: X01InputMode
}

export const isVoiceInputSupportedForMode = (
  mode: GameModeId,
  options: VoiceModeSupportOptions = {},
): boolean => {
  if (ALWAYS_VOICE_INPUT_MODES.has(mode)) {
    return true
  }

  return VISIT_SCORE_VOICE_MODES.has(mode) && options.x01InputMode === X01InputMode.VisitScore
}

export const isVisitScoreVoiceMode = (mode: GameModeId): boolean =>
  VISIT_SCORE_VOICE_MODES.has(mode)
