import { Box, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import type { VoiceCommandHelpSection } from '../../lib/voice/voiceCommandHelp'

export interface VoiceCommandsHelpSectionProps {
  section: VoiceCommandHelpSection
}

const columns = 'minmax(7.5rem, 0.9fr) minmax(0, 1.1fr)'

/** Shared voice-commands block (heading + intro + say/meaning table) for help dialogs. */
export const VoiceCommandsHelpSection = ({ section }: VoiceCommandsHelpSectionProps) => (
  <Stack gap={3} as="section" aria-labelledby="voice-commands-heading">
    <Heading
      id="voice-commands-heading"
      as="h2"
      size="sm"
      color="white"
      fontFamily="Archivo Black, sans-serif"
      letterSpacing="0.02em"
    >
      {section.title}
    </Heading>
    <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
      {section.intro}
    </Text>
    <Box
      role="table"
      aria-label={section.title}
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      borderRadius="md"
      overflow="hidden"
      bg="whiteAlpha.50"
    >
      <Grid
        role="row"
        templateColumns={columns}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.300"
        bg="whiteAlpha.100"
      >
        <Text
          role="columnheader"
          px={3}
          py={2.5}
          fontSize="xs"
          fontWeight="semibold"
          color="whiteAlpha.700"
          textTransform="uppercase"
          letterSpacing="0.04em"
          borderRightWidth="1px"
          borderColor="whiteAlpha.300"
        >
          Say
        </Text>
        <Text
          role="columnheader"
          px={3}
          py={2.5}
          fontSize="xs"
          fontWeight="semibold"
          color="whiteAlpha.700"
          textTransform="uppercase"
          letterSpacing="0.04em"
        >
          Meaning
        </Text>
      </Grid>
      {section.rows.map((row, index) => (
        <Grid
          key={row.say}
          role="row"
          templateColumns={columns}
          borderBottomWidth={index === section.rows.length - 1 ? '0' : '1px'}
          borderColor="whiteAlpha.300"
        >
          <Box role="cell" px={3} py={2.5} borderRightWidth="1px" borderColor="whiteAlpha.300">
            <Text fontSize="sm" fontWeight="semibold" color="orange.200" lineHeight="1.4">
              {`"${row.say}"`}
            </Text>
          </Box>
          <Box role="cell" px={3} py={2.5}>
            <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.45">
              {row.means}
            </Text>
          </Box>
        </Grid>
      ))}
    </Box>
    {section.note !== undefined ? (
      <Text fontSize="xs" color="whiteAlpha.600">
        {section.note}
      </Text>
    ) : null}
  </Stack>
)
