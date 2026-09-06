import { SegmentGroup } from '@chakra-ui/react'
import { StatsCountLabel } from './StatsCountLabel'

export interface StatsVariantToggleItem {
  value: string
  label: string
  count: number
}

export interface StatsVariantToggleProps {
  items: StatsVariantToggleItem[]
  value: string
  onChange: (value: string) => void
  countUnit?: 'Session' | 'Leg'
}

export const StatsVariantToggle = ({
  items,
  value,
  onChange,
  countUnit = 'Session',
}: StatsVariantToggleProps) => {
  if (items.length <= 1) {
    const [onlyItem] = items

    if (onlyItem === undefined) {
      return null
    }

    return <StatsCountLabel count={onlyItem.count} unit={countUnit} />
  }

  return (
    <SegmentGroup.Root
      size="sm"
      value={value}
      onValueChange={(details) => {
        if (details.value !== null) {
          onChange(details.value)
        }
      }}
      bg="whiteAlpha.100"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      p="1"
      w="fit-content"
      maxW="full"
    >
      <SegmentGroup.Indicator bg="whiteAlpha.200" />
      <SegmentGroup.Items
        items={items.map((item) => ({
          value: item.value,
          label: `${item.label} (${item.count})`,
        }))}
        color="whiteAlpha.800"
        _checked={{ color: 'white', fontWeight: 'semibold' }}
      />
    </SegmentGroup.Root>
  )
}
