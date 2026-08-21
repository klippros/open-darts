import { Stack } from '@chakra-ui/react'
import { useSettings } from '../../hooks/settingsContext'
import { MAX_VOICE_ISOLATION_MS, MIN_VOICE_ISOLATION_MS } from '../../lib/voice/commandIsolation'
import { SettingsSliderRow } from './SettingsSliderRow'
import { SettingsSwitchRow } from './SettingsSwitchRow'

export const SettingsPopoverContent = () => {
  const {
    scoreCallerEnabled,
    setScoreCallerEnabled,
    uiSoundsEnabled,
    setUiSoundsEnabled,
    voiceIsolationMs,
    setVoiceIsolationMs,
  } = useSettings()

  return (
    <Stack gap={4}>
      <SettingsSwitchRow
        label="Score caller"
        description="Speak scores during play"
        checked={scoreCallerEnabled}
        onCheckedChange={setScoreCallerEnabled}
      />
      <SettingsSwitchRow
        label="UI sounds"
        description="Play sound feedback when scoring"
        checked={uiSoundsEnabled}
        onCheckedChange={setUiSoundsEnabled}
      />
      {import.meta.env.DEV ? (
        <SettingsSliderRow
          label="Voice isolation"
          description="Silence required before and after a command, and after the score caller before listening again."
          value={voiceIsolationMs}
          min={MIN_VOICE_ISOLATION_MS}
          max={MAX_VOICE_ISOLATION_MS}
          step={50}
          valueLabel={`${voiceIsolationMs} ms`}
          onValueChange={setVoiceIsolationMs}
        />
      ) : null}
    </Stack>
  )
}
