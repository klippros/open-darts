import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Grid, Input, Stack } from '@chakra-ui/react'
import { scoreInputButtonHeight } from '../../../layout'
import {
  appendVisitScoreDigit,
  backspaceVisitScoreInput,
  parseVisitScoreInput,
} from './visitScoreInput'

export interface VisitScorePickerProps {
  onSubmit: (score: number) => void
  onUndo: () => void
  inputDisabled?: boolean
}

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'] as const

type PadKey = (typeof PAD_KEYS)[number]

const padKeyLabel = (key: PadKey): string => {
  if (key === 'clear') {
    return 'Clear'
  }

  if (key === 'enter') {
    return 'Enter'
  }

  return key
}

const outlinePadKeyProps = (color: 'red' | 'green') => ({
  borderColor: `${color}.400`,
  color: `${color}.200`,
  _hover: { borderColor: `${color}.300`, bg: 'transparent', transform: 'scale(1.03)' },
  _active: { bg: 'transparent', transform: 'scale(0.98)' },
})

const padKeyProps = (key: PadKey) => {
  if (key === 'clear') {
    return outlinePadKeyProps('red')
  }

  if (key === 'enter') {
    return outlinePadKeyProps('green')
  }

  return {}
}

export const VisitScorePicker = ({
  onSubmit,
  onUndo,
  inputDisabled = false,
}: VisitScorePickerProps) => {
  const [value, setValue] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value

  const submitCurrentValue = useCallback(() => {
    if (inputDisabled) {
      return
    }

    const score = parseVisitScoreInput(valueRef.current)

    if (score === null) {
      return
    }

    setValue('')
    onSubmit(score)
  }, [inputDisabled, onSubmit])

  useEffect(() => {
    if (inputDisabled) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        setValue((current) => appendVisitScoreDigit(current, event.key))
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setValue((current) => backspaceVisitScoreInput(current))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        submitCurrentValue()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setValue('')
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [inputDisabled, submitCurrentValue])

  const canSubmit = parseVisitScoreInput(value) !== null && !inputDisabled

  const onPadKey = (key: PadKey) => {
    if (key === 'clear') {
      setValue('')
      return
    }

    if (key === 'enter') {
      submitCurrentValue()
      return
    }

    setValue((current) => appendVisitScoreDigit(current, key))
  }

  return (
    <Stack gap={3}>
      <Input
        value={value}
        placeholder="Visit score"
        textAlign="center"
        fontSize="2xl"
        fontWeight="semibold"
        h="14"
        readOnly
        inputMode="numeric"
        aria-label="Visit score"
        disabled={inputDisabled}
      />

      <Grid templateColumns="repeat(3, 1fr)" gap={2}>
        {PAD_KEYS.map((key) => (
          <Button
            key={key}
            variant="cta"
            h={scoreInputButtonHeight}
            disabled={key === 'enter' ? !canSubmit : inputDisabled}
            onClick={() => {
              onPadKey(key)
            }}
            {...padKeyProps(key)}
          >
            {padKeyLabel(key)}
          </Button>
        ))}
      </Grid>

      <Button variant="cta" disabled={inputDisabled} onClick={onUndo}>
        Undo
      </Button>
    </Stack>
  )
}
