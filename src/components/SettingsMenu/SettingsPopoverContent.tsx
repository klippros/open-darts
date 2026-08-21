import { Stack } from '@chakra-ui/react'
import { useSettings } from '../../hooks/settingsContext'
import { SettingsSwitchRow } from './SettingsSwitchRow'

export const SettingsPopoverContent = () => {
  const { scoreCallerEnabled, setScoreCallerEnabled, uiSoundsEnabled, setUiSoundsEnabled } =
    useSettings()

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
    </Stack>
  )
}
