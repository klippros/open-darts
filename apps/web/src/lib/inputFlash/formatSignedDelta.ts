/** Format a score or advance delta with an explicit sign (`+40`, `-40`, `+0`). */
export const formatSignedDelta = (value: number): string => {
  if (value > 0) {
    return `+${value}`
  }

  if (value < 0) {
    return String(value)
  }

  return '+0'
}
