import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: string
  detail?: string
  onClick?: () => void
}

export const StatCard = ({ label, value, detail, onClick }: StatCardProps) => {
  const content = (
    <>
      <Text fontSize="sm" color="whiteAlpha.700" mb={1}>
        {label}
      </Text>
      <Text color="white" fontFamily="Archivo Black, sans-serif" fontSize="2xl" lineHeight="1">
        {value}
      </Text>
      {detail !== undefined && (
        <Text mt={2} fontSize="sm" color="whiteAlpha.600" lineHeight="1.5">
          {detail}
        </Text>
      )}
    </>
  )

  if (onClick === undefined) {
    return (
      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        bg="whiteAlpha.50"
        px={5}
        py={4}
      >
        {content}
      </Box>
    )
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      h="auto"
      w="full"
      display="block"
      textAlign="left"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={5}
      py={4}
      cursor="pointer"
      fontWeight="normal"
      whiteSpace="normal"
      transition="border-color 0.15s ease, background 0.15s ease"
      _hover={{ borderColor: 'whiteAlpha.400', bg: 'whiteAlpha.100' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '2px' }}
    >
      {content}
    </Button>
  )
}

export const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Stack gap={1}>
    <Heading as="h2" size="xl" color="white" fontFamily="Archivo Black, sans-serif">
      {title}
    </Heading>
    {subtitle !== undefined && (
      <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
        {subtitle}
      </Text>
    )}
  </Stack>
)

export const EmptySection = ({ message }: { message: string }) => (
  <Box
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
  >
    <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
      {message}
    </Text>
  </Box>
)
