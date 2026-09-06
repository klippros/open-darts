import { Box, Button, HStack, Text } from '@chakra-ui/react'

export interface SettingsSegmentOption<T extends string> {
  value: T
  label: string
}

export interface SettingsSegmentRowProps<T extends string> {
  label: string
  description: string
  value: T
  options: SettingsSegmentOption<T>[]
  onValueChange: (value: T) => void
}

export const SettingsSegmentRow = <T extends string>({
  label,
  description,
  value,
  options,
  onValueChange,
}: SettingsSegmentRowProps<T>) => (
  <Box>
    <Text fontSize="sm" fontWeight="medium" color="white">
      {label}
    </Text>
    <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.4" mt={0.5} mb={3}>
      {description}
    </Text>
    <HStack
      gap={0}
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      borderRadius="md"
      overflow="hidden"
      w="full"
    >
      {options.map((option, index) => {
        const isSelected = option.value === value

        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            h="8"
            flex="1"
            minW={0}
            px={2}
            borderRadius={0}
            borderWidth={0}
            borderLeftWidth={index === 0 ? 0 : '1px'}
            borderLeftColor="whiteAlpha.300"
            bg={isSelected ? 'white' : 'transparent'}
            color={isSelected ? 'black' : 'whiteAlpha.800'}
            fontWeight={isSelected ? 'semibold' : 'normal'}
            _hover={{
              bg: isSelected ? 'white' : 'whiteAlpha.100',
              color: isSelected ? 'black' : 'white',
            }}
            onClick={() => {
              onValueChange(option.value)
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </HStack>
  </Box>
)
