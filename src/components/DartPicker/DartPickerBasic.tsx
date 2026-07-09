import { Button, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { createDartThrow } from '../../lib/dartScoring'
import { toolbarControlSize } from '../../layout'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'

export interface DartPickerBasicProps {
  onDart: (dart: DartThrow) => void
  onUndo: () => void
  disabled?: boolean
}

const MULTIPLIERS = [
  { value: DartMultiplier.Single, label: 'S' },
  { value: DartMultiplier.Double, label: 'D' },
  { value: DartMultiplier.Triple, label: 'T' },
] as const

const NUMBER_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
] as const

export const DartPickerBasic = ({ onDart, onUndo, disabled = false }: DartPickerBasicProps) => {
  const [multiplier, setMultiplier] = useState<DartMultiplier>(DartMultiplier.Single)

  const recordNumber = (value: number) => {
    onDart(createDartThrow({ type: DartSegmentType.Number, value }, multiplier))
  }

  const recordOuterBull = () => {
    onDart(createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single))
  }

  const recordBull = () => {
    onDart(createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single))
  }

  const recordMiss = () => {
    onDart(createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss))
  }

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.700">
          Multiplier
        </Text>
        <SimpleGrid columns={3} gap={2}>
          {MULTIPLIERS.map((option) => (
            <Button
              key={option.value}
              variant={multiplier === option.value ? 'emphasis' : 'cta'}
              minH={toolbarControlSize}
              onClick={() => {
                setMultiplier(option.value)
              }}
              disabled={disabled}
            >
              {option.label}
            </Button>
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.700">
          Segment
        </Text>
        <Stack gap={2}>
          {NUMBER_ROWS.map((row) => (
            <SimpleGrid key={row.join('-')} columns={5} gap={2}>
              {row.map((value) => (
                <Button
                  key={value}
                  variant="cta"
                  minH={toolbarControlSize}
                  onClick={() => {
                    recordNumber(value)
                  }}
                  disabled={disabled}
                >
                  {value}
                </Button>
              ))}
            </SimpleGrid>
          ))}
        </Stack>
      </Stack>

      <SimpleGrid columns={3} gap={2}>
        <Button
          variant="cta"
          minH={toolbarControlSize}
          onClick={recordOuterBull}
          disabled={disabled}
        >
          25
        </Button>
        <Button variant="cta" minH={toolbarControlSize} onClick={recordBull} disabled={disabled}>
          Bull
        </Button>
        <Button variant="cta" minH={toolbarControlSize} onClick={recordMiss} disabled={disabled}>
          Miss
        </Button>
      </SimpleGrid>

      <Button variant="cancel" onClick={onUndo} disabled={disabled}>
        Undo last dart
      </Button>
    </Stack>
  )
}
