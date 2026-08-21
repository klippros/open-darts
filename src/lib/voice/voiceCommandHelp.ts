import { GameModeId } from '../../types/gameMode'
import { isVoiceInputSupportedForMode } from './voiceModeSupport'

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

/**
 * User-facing voice command table for match help dialogs.
 * Returns null when voice input is not available for the mode.
 */
export const getVoiceCommandHelpSection = (mode: GameModeId): VoiceCommandHelpSection | null => {
  if (!isVoiceInputSupportedForMode(mode)) {
    return null
  }

  if (mode === GameModeId.Bob27) {
    return {
      title: VOICE_COMMANDS_SECTION_TITLE,
      intro: VOICE_COMMANDS_SECTION_INTRO,
      note: 'Also accepted: "hit one", "hit 1", "hit two", and so on.',
      rows: [
        { say: 'One hit', means: 'Score 1 hit on the current target' },
        { say: 'Two hits', means: 'Score 2 hits' },
        { say: 'Three hits', means: 'Score 3 hits' },
        { say: 'Missed all', means: 'Score 0 hits' },
        { say: 'Undo', means: 'Remove the last voice entry' },
        { say: 'Fix two hits', means: 'Replace the last voice entry' },
      ],
    }
  }

  if (mode === GameModeId.AroundTheClock) {
    return {
      title: VOICE_COMMANDS_SECTION_TITLE,
      intro: VOICE_COMMANDS_SECTION_INTRO,
      note: 'Speak three hit/miss results for each visit (e.g. Hit miss hit), or Missed all. Do not say hit counts like "two hits".',
      rows: [
        { say: 'Hit hit miss', means: 'Example full visit (hit, hit, miss)' },
        { say: 'Miss miss miss', means: 'Three misses' },
        { say: 'Missed all', means: 'Miss every dart in this visit' },
        { say: 'Undo', means: 'Remove the last voice entry' },
        { say: 'Fix hit miss miss', means: 'Replace the last voice entry' },
      ],
    }
  }

  return null
}

/** Compact cheat-sheet lines for DEV logging. */
export const getVoiceCommandHelpLines = (mode: GameModeId): string[] => {
  const section = getVoiceCommandHelpSection(mode)

  if (section === null) {
    return ['(voice scoring unavailable for this mode)']
  }

  return section.rows.map((row) => `${row.say} — ${row.means}`)
}
