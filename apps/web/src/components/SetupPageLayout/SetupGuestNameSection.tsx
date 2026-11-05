import { Box, Input } from '@chakra-ui/react'
import { SetupSection } from './SetupSection'

export interface SetupGuestNameSectionProps {
  guestName: string
  onGuestNameChange: (value: string) => void
}

export const SetupGuestNameSection = ({
  guestName,
  onGuestNameChange,
}: SetupGuestNameSectionProps) => (
  <SetupSection title="Guest name">
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={4}
      py={4}
    >
      <Input
        value={guestName}
        onChange={(event) => {
          onGuestNameChange(event.target.value)
        }}
        placeholder="Guest"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
        color="white"
      />
    </Box>
  </SetupSection>
)
