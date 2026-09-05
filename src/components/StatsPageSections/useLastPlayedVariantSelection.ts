import { useState } from 'react'
import { pickLastPlayedVariant } from '../../lib/analytics/pickLastPlayedVariant'

export const useLastPlayedVariantSelection = <T>(
  variants: readonly T[],
  getKey: (variant: T) => string,
  getLastPlayedAt: (variant: T) => string | null,
): {
  selectedKey: string
  setSelectedKey: (key: string) => void
  selected: T | undefined
} => {
  const defaultVariant = pickLastPlayedVariant(variants, getLastPlayedAt)
  const defaultKey = defaultVariant === undefined ? '' : getKey(defaultVariant)

  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const resolvedKey =
    selectedKey !== null && variants.some((variant) => getKey(variant) === selectedKey)
      ? selectedKey
      : defaultKey

  const selected = variants.find((variant) => getKey(variant) === resolvedKey)

  return { selectedKey: resolvedKey, setSelectedKey, selected }
}
