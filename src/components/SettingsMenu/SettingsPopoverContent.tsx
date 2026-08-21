import { Stack } from '@chakra-ui/react'
import { useSettings } from '../../hooks/settingsContext'
import { X01InputMode } from '../../types/settings'
import { SettingsSwitchRow } from './SettingsSwitchRow'

export const SettingsPopoverContent = () => {
  const {
    scoreCallerEnabled,
    setScoreCallerEnabled,
    uiSoundsEnabled,
    setUiSoundsEnabled,
    x01InputMode,
    setX01InputMode,
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
      <SettingsSwitchRow
        label="Visit score input"
        description="Enter a visit total (0–180) instead of each dart for X01, 121, and 10-up-1-down"
        checked={x01InputMode === X01InputMode.VisitScore}
        onCheckedChange={(checked) => {
          setX01InputMode(checked ? X01InputMode.VisitScore : X01InputMode.Board)
        }}
      />
    </Stack>
  )
}
