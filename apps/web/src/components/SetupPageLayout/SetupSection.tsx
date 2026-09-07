import { Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface SetupSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export const SetupSection = ({ title, description, children }: SetupSectionProps) => (
  <Stack gap={3}>
    <Stack gap={description === undefined ? 0 : 1}>
      <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
        {title}
      </Text>
      {description !== undefined && (
        <Text color="whiteAlpha.600" fontSize="sm" lineHeight="1.55">
          {description}
        </Text>
      )}
    </Stack>
    {children}
  </Stack>
)
