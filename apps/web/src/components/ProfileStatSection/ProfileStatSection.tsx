import { Heading, Stack, Text } from '@chakra-ui/react'
import type { ProfileStatRow } from '../../lib/profile/formatProfileStats'

export interface ProfileStatSectionProps {
  title: string
  windowLabel: string
  rows: ProfileStatRow[]
}

export const ProfileStatSection = ({ title, windowLabel, rows }: ProfileStatSectionProps) => {
  if (rows.length === 0) {
    return null
  }

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
          {title}
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.600">
          {windowLabel}
        </Text>
      </Stack>
      <Stack gap={2}>
        {rows.map((row) => (
          <Stack
            key={row.label}
            direction="row"
            justify="space-between"
            gap={4}
            borderBottomWidth="1px"
            borderColor="whiteAlpha.100"
            pb={2}
          >
            <Text color="whiteAlpha.700" fontSize="sm">
              {row.label}
            </Text>
            <Text color="white" fontWeight="semibold" fontSize="sm">
              {row.value}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
