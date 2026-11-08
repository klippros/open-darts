import { describe, expect, it } from 'vitest'
import {
  ComboboxKey,
  nextComboboxActiveIndex,
  shouldScrollComboboxOptionIntoView,
} from './comboboxKeyboard'

describe('combobox keyboard helpers', () => {
  it('moves the active option within bounds', () => {
    expect(nextComboboxActiveIndex(0, ComboboxKey.ArrowDown, 3)).toBe(1)
    expect(nextComboboxActiveIndex(2, ComboboxKey.ArrowDown, 3)).toBe(2)
    expect(nextComboboxActiveIndex(1, ComboboxKey.ArrowUp, 3)).toBe(0)
    expect(nextComboboxActiveIndex(0, ComboboxKey.ArrowUp, 3)).toBe(0)
  })

  it('signals scroll only when the active option changes', () => {
    expect(shouldScrollComboboxOptionIntoView(0, 1)).toBe(true)
    expect(shouldScrollComboboxOptionIntoView(1, 1)).toBe(false)
  })
})
