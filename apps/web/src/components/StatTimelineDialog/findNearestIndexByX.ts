/** Returns the index of the nearest non-null x, preferring the lower index on a tie. */
export const findNearestIndexByX = (pointerX: number, xs: (number | null)[]): number | null => {
  let bestIndex: number | null = null
  let bestDistance = Infinity

  for (let index = 0; index < xs.length; index++) {
    const x = xs[index]

    if (x === null || x === undefined) {
      continue
    }

    const distance = Math.abs(x - pointerX)

    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}
