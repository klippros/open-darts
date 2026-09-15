import { Button, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { NinetyNineDartsTargetKind } from '@open-darts/game/types/ninetyNineDarts'
import type {
  NinetyNineDartsConfig,
  NinetyNineDartsTarget,
} from '@open-darts/game/types/ninetyNineDarts'
import { buildNinetyNineDartsGamePath } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsConfig'

const NUMBER_TARGETS = Array.from({ length: 20 }, (_, index) => index + 1)

const targetsEqual = (left: NinetyNineDartsTarget, right: NinetyNineDartsTarget): boolean => {
  if (
    left.kind === NinetyNineDartsTargetKind.Bull ||
    right.kind === NinetyNineDartsTargetKind.Bull
  ) {
    return left.kind === right.kind
  }

  return left.value === right.value
}

const TargetButton = ({
  label,
  selected,
  onSelect,
  gridColumn,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  gridColumn?: { base: string; sm: string }
}) => (
  <Button
    type="button"
    variant="ghost"
    onClick={onSelect}
    h="auto"
    py={4}
    gridColumn={gridColumn}
    borderWidth="2px"
    borderColor={selected ? 'orange.300' : 'whiteAlpha.200'}
    borderRadius="lg"
    bg={selected ? 'rgba(246, 173, 85, 0.14)' : 'whiteAlpha.50'}
    color="white"
    fontWeight="semibold"
    _hover={{
      borderColor: selected ? 'orange.200' : 'whiteAlpha.400',
      bg: selected ? 'rgba(246, 173, 85, 0.2)' : 'whiteAlpha.100',
    }}
  >
    {label}
  </Button>
)

export const NinetyNineDartsSetupPage = () => {
  const navigate = useNavigate()
  const [target, setTarget] = useState<NinetyNineDartsTarget>({
    kind: NinetyNineDartsTargetKind.Number,
    value: 20,
  })

  const handleStart = () => {
    const config: NinetyNineDartsConfig = { target }

    void navigate(buildNinetyNineDartsGamePath(config))
  }

  const bullTarget: NinetyNineDartsTarget = { kind: NinetyNineDartsTargetKind.Bull }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="99 Darts"
          description="Throw 99 darts at one target. Record each dart as single, double, treble, or miss."
        />

        <SetupSection title="Target">
          <SimpleGrid columns={{ base: 4, sm: 5 }} gap={2}>
            {NUMBER_TARGETS.map((value) => {
              const option: NinetyNineDartsTarget = {
                kind: NinetyNineDartsTargetKind.Number,
                value,
              }

              return (
                <TargetButton
                  key={value}
                  label={String(value)}
                  selected={targetsEqual(target, option)}
                  onSelect={() => {
                    setTarget(option)
                  }}
                />
              )
            })}
            <TargetButton
              label="Bull"
              selected={targetsEqual(target, bullTarget)}
              onSelect={() => {
                setTarget(bullTarget)
              }}
              gridColumn={{ base: 'span 2', sm: 'span 1' }}
            />
          </SimpleGrid>
          <Text fontSize="sm" color="whiteAlpha.700" mt={2}>
            Singles score 1, doubles 2, trebles 3. On bull, outer is 1 and double bull is 2.
          </Text>
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
