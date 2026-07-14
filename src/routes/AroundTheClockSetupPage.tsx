import { Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { AroundTheClockAimMode, type AroundTheClockConfig } from '../types/aroundTheClock'
import {
  buildAroundTheClockGamePath,
  getAroundTheClockAimModeDescription,
  getAroundTheClockAimModeLabel,
} from '../lib/aroundTheClock/aroundTheClockConfig'

const AIM_MODES = [
  AroundTheClockAimMode.Singles,
  AroundTheClockAimMode.Doubles,
  AroundTheClockAimMode.Trebles,
  AroundTheClockAimMode.Any,
] as const

export const AroundTheClockSetupPage = () => {
  const navigate = useNavigate()
  const [aimMode, setAimMode] = useState<AroundTheClockAimMode>(AroundTheClockAimMode.Any)
  const [finishOnBull, setFinishOnBull] = useState(true)

  const handleStart = () => {
    const config: AroundTheClockConfig = {
      finishOnBull,
      aimMode,
    }

    void navigate(buildAroundTheClockGamePath(config))
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Around the Clock"
          description="Choose what you are aiming for on each number, then hit 1 through 20 and bull."
        />

        <SetupSection title="Aim mode">
          <Stack gap={2}>
            {AIM_MODES.map((mode) => (
              <SetupOptionCard
                key={mode}
                label={getAroundTheClockAimModeLabel(mode)}
                description={getAroundTheClockAimModeDescription(mode)}
                selected={aimMode === mode}
                onSelect={() => {
                  setAimMode(mode)
                }}
              />
            ))}
          </Stack>
        </SetupSection>

        <SetupSection title="Finish">
          <Stack gap={2}>
            <SetupOptionCard
              label="Finish on bull"
              description="Complete the run by hitting bull after 20"
              selected={finishOnBull}
              onSelect={() => {
                setFinishOnBull((current) => !current)
              }}
            />
          </Stack>
        </SetupSection>

        <SetupPageActions
          primaryLabel="Start game"
          onBack={() => void navigate('/')}
          onPrimary={handleStart}
        />
      </Stack>
    </SetupPageLayout>
  )
}
