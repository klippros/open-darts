const WHITE = { r: 255, g: 255, b: 255 }

export const HOVER_LIGHTEN_AMOUNT = 0.22

const toHex = (value: number): string => value.toString(16).padStart(2, '0')

const parseHexColor = (fill: string): { r: number; g: number; b: number } | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(fill)

  if (match === null || match[1] === undefined) {
    return null
  }

  const hex = match[1]

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

export const lightenHex = (fill: string, amount: number = HOVER_LIGHTEN_AMOUNT): string => {
  const color = parseHexColor(fill)

  if (color === null) {
    return fill
  }

  const ratio = Math.min(1, Math.max(0, amount))

  return `#${toHex(Math.round(color.r + (WHITE.r - color.r) * ratio))}${toHex(Math.round(color.g + (WHITE.g - color.g) * ratio))}${toHex(Math.round(color.b + (WHITE.b - color.b) * ratio))}`
}
