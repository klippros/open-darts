export const ComboboxKey = {
  ArrowDown: 'ArrowDown',
  ArrowUp: 'ArrowUp',
  Enter: 'Enter',
  Escape: 'Escape',
} as const

export type ComboboxKey = (typeof ComboboxKey)[keyof typeof ComboboxKey]

export const nextComboboxActiveIndex = (
  currentIndex: number,
  key: string,
  optionCount: number,
): number => {
  if (optionCount <= 0) {
    return 0
  }

  if (key === ComboboxKey.ArrowDown) {
    return Math.min(currentIndex + 1, optionCount - 1)
  }

  if (key === ComboboxKey.ArrowUp) {
    return Math.max(currentIndex - 1, 0)
  }

  return currentIndex
}

export const shouldScrollComboboxOptionIntoView = (
  previousIndex: number,
  nextIndex: number,
): boolean => previousIndex !== nextIndex
