import { GameModeId } from '../../types/gameMode'
import type { X01InputMode } from '../../types/settings'
import { isVisitScoreVoiceMode, isVoiceInputSupportedForMode } from './voiceModeSupport'

export const VOICE_COMMANDS_SECTION_TITLE = 'Voice commands'

/** Shared intro under the Voice commands heading in help dialogs. */
export const VOICE_COMMANDS_SECTION_INTRO =
  'Enable the mic in the header to turn on voice detection for this game.'

export interface VoiceCommandHelpRow {
  say: string
  means: string
}

export interface VoiceCommandHelpSection {
  title: string
  intro: string
  /** Optional footnote under the table (aliases, caveats). */
  note?: string
  rows: VoiceCommandHelpRow[]
}

export interface VoiceCommandHelpOptions {
  x01InputMode?: X01InputMode
}

/**
 * User-facing voice command table for match help dialogs.
 * Returns null when voice input is not available for the mode.
 */
export const getVoiceCommandHelpSection = (
  mode: GameModeId,
  options: VoiceCommandHelpOptions = {},
): VoiceCommandHelpSection | null => {
  if (!isVoiceInputSupportedForMode(mode, options)) {
    return null
  }

  if (mode === GameModeId.Bob27) {
    return {
      title: VOICE_COMMANDS_SECTION_TITLE,
      intro: VOICE_COMMANDS_SECTION_INTRO,
      note: 'Also accepted: "zero hits", "miss all", "hit one", "hit 1", and so on.',
      rows: [
        { say: 'One hit', means: 'Score 1 hit on the current target' },
        { say: 'Two hits', means: 'Score 2 hits' },
        { say: 'Three hits', means: 'Score 3 hits' },
        { say: 'No hits', means: 'Score 0 hits' },
        { say: 'Undo', means: 'Remove the last voice entry' },
        { say: 'Fix two hits', means: 'Replace the last voice entry' },
      ],
    }
  }

  if (mode === GameModeId.AroundTheClock) {
    return {
      title: VOICE_COMMANDS_SECTION_TITLE,
      intro: VOICE_COMMANDS_SECTION_INTRO,
      note: 'Say each dart in order (Hit or Miss), then pause. Wipe the rest of the visit with "No hits". Do not say hit counts like "two hits".',
      rows: [
        { say: 'Hit hit miss', means: 'Example full visit (hit, hit, miss)' },
        { say: 'Miss miss miss', means: 'Three misses' },
        { say: 'No hits', means: 'Miss every dart in this visit' },
        { say: 'Undo', means: 'Remove the last voice entry' },
        { say: 'Fix hit miss miss', means: 'Replace the last voice entry' },
      ],
    }
  }

  if (isVisitScoreVoiceMode(mode)) {
    return {
      title: VOICE_COMMANDS_SECTION_TITLE,
      intro: VOICE_COMMANDS_SECTION_INTRO,
      note: 'Say the visit total from 1 to 180, or "no score" for a blank visit. Scores above remaining bust automatically.',
      rows: [
        { say: 'Sixty', means: 'Score 60 for the visit' },
        { say: 'One eighty', means: 'Score 180' },
        { say: 'Twenty six', means: 'Score 26' },
        { say: 'No score', means: 'Record a visit with no points' },
        { say: 'Undo', means: 'Remove the last voice entry' },
        { say: 'Fix sixty', means: 'Replace the last voice entry' },
      ],
    }
  }

  return null
}

/** Compact cheat-sheet lines for DEV logging. */
export const getVoiceCommandHelpLines = (
  mode: GameModeId,
  options: VoiceCommandHelpOptions = {},
): string[] => {
  const section = getVoiceCommandHelpSection(mode, options)

  if (section === null) {
    return ['(voice scoring unavailable for this mode)']
  }

  return section.rows.map((row) => `${row.say} — ${row.means}`)
}
