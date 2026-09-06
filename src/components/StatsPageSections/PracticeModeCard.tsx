import type { ReactNode } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

export const PracticeModeCard = ({
  title,
  trailing,
  children,
}: {
  title: string
  trailing?: ReactNode
  children?: ReactNode
}) => (
  <Box
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
  >
    <Stack gap={3}>
      <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
        <Text fontWeight="semibold" color="white">
          {title}
        </Text>
        {trailing}
      </Flex>
      {children}
    </Stack>
  </Box>
)
