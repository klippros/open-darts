import { Stack } from '@chakra-ui/react'
import { useSettings } from '../../hooks/settingsContext'
import { SingleDartScoringMode } from '../../types/settings'
import { SettingsSegmentRow } from './SettingsSegmentRow'
import { SettingsSwitchRow } from './SettingsSwitchRow'

const SINGLE_DART_SCORING_OPTIONS = [
  { value: SingleDartScoringMode.Always, label: 'Always' },
  { value: SingleDartScoringMode.Sub171, label: 'Sub 171' },
  { value: SingleDartScoringMode.Never, label: 'Never' },
]

export const SettingsPopoverContent = () => {
  const {
    scoreCallerEnabled,
    setScoreCallerEnabled,
    uiSoundsEnabled,
    setUiSoundsEnabled,
    singleDartScoring,
    setSingleDartScoring,
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
      <SettingsSegmentRow
        label="Single dart scoring"
        description="Enter each dart, or full visit scores."
        value={singleDartScoring}
        options={SINGLE_DART_SCORING_OPTIONS}
        onValueChange={setSingleDartScoring}
      />
    </Stack>
  )
}
