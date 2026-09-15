import { Heading, Stack, Text } from '@chakra-ui/react'

export interface SetupPageHeaderProps {
  title: string
  description: string
}

export const SetupPageHeader = ({ title, description }: SetupPageHeaderProps) => (
  <Stack gap={2}>
    <Heading as="h1" size="xl" color="white" fontFamily="Archivo Black, sans-serif">
      {title}
    </Heading>
    <Text color="whiteAlpha.700" fontSize="md" lineHeight="1.65">
      {description}
    </Text>
  </Stack>
)
