import { GameModeId } from '../../types/gameMode'

/** Modes where browser speech recognition is reliable enough for scoring. */
const VOICE_INPUT_MODES = new Set<GameModeId>([GameModeId.Bob27, GameModeId.AroundTheClock])

export const isVoiceInputSupportedForMode = (mode: GameModeId): boolean =>
  VOICE_INPUT_MODES.has(mode)
