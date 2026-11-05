import { Stack } from '@chakra-ui/react'
import { STARTING_PLAYER_INDEX_RANDOM } from '@open-darts/game/game/matchLegs'
import { SetupOptionCard } from './SetupOptionCard'
import { SetupSection } from './SetupSection'

export interface SetupFirstThrowSectionProps {
  startingPlayerIndex: number
  onStartingPlayerIndexChange: (value: number) => void
  primaryPlayerLabel: string
  opponentLabel: string
  randomDescription?: string
  primaryDescription?: string
  opponentDescription?: string
}

export const SetupFirstThrowSection = ({
  startingPlayerIndex,
  onStartingPlayerIndexChange,
  primaryPlayerLabel,
  opponentLabel,
  randomDescription = 'Coin flip who throws first',
  primaryDescription = `${primaryPlayerLabel} throws first`,
  opponentDescription = `${opponentLabel} throws first`,
}: SetupFirstThrowSectionProps) => (
  <SetupSection title="First throw">
    <Stack gap={2}>
      <SetupOptionCard
        label="Random"
        description={randomDescription}
        selected={startingPlayerIndex === STARTING_PLAYER_INDEX_RANDOM}
        onSelect={() => {
          onStartingPlayerIndexChange(STARTING_PLAYER_INDEX_RANDOM)
        }}
      />
      <SetupOptionCard
        label={primaryPlayerLabel}
        description={primaryDescription}
        selected={startingPlayerIndex === 0}
        onSelect={() => {
          onStartingPlayerIndexChange(0)
        }}
      />
      <SetupOptionCard
        label={opponentLabel}
        description={opponentDescription}
        selected={startingPlayerIndex === 1}
        onSelect={() => {
          onStartingPlayerIndexChange(1)
        }}
      />
    </Stack>
  </SetupSection>
)
