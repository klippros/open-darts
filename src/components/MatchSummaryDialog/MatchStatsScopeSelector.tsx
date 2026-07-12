import { Button, HStack, Stack, Text } from '@chakra-ui/react'

export type MatchStatsScope = 'match' | number

export interface MatchStatsScopeSelectorProps {
  legNumbers: number[]
  selectedScope: MatchStatsScope
  onScopeChange: (scope: MatchStatsScope) => void
}

const scopeButtonStyle = (isSelected: boolean) =>
  isSelected
    ? { variant: 'emphasis' as const }
    : { variant: 'ghost' as const, color: 'whiteAlpha.800' }

export const MatchStatsScopeSelector = ({
  legNumbers,
  selectedScope,
  onScopeChange,
}: MatchStatsScopeSelectorProps) => {
  if (legNumbers.length <= 1) {
    return null
  }

  const options: { scope: MatchStatsScope; label: string }[] = [
    { scope: 'match', label: 'Match' },
    ...legNumbers.map((legNumber) => ({
      scope: legNumber,
      label: `Leg ${legNumber}`,
    })),
  ]

  if (legNumbers.length > 5) {
    return (
      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.700">
          Stats for
        </Text>
        <select
          value={String(selectedScope)}
          onChange={(event) => {
            const { value } = event.target
            onScopeChange(value === 'match' ? 'match' : Number(value))
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            fontSize: '0.875rem',
          }}
        >
          {options.map((option) => (
            <option key={String(option.scope)} value={String(option.scope)}>
              {option.label}
            </option>
          ))}
        </select>
      </Stack>
    )
  }

  return (
    <HStack gap={2} flexWrap="wrap">
      {options.map((option) => {
        const isSelected = selectedScope === option.scope

        return (
          <Button
            key={String(option.scope)}
            size="sm"
            {...scopeButtonStyle(isSelected)}
            onClick={() => {
              onScopeChange(option.scope)
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </HStack>
  )
}
