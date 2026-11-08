export interface RequestGeneration {
  next: () => number
  isCurrent: (requestId: number) => boolean
  invalidate: () => void
}

/** Monotonic request ids so stale async responses can be ignored after account/match/profile changes. */
export const createRequestGeneration = (): RequestGeneration => {
  let current = 0

  return {
    next: () => {
      current += 1
      return current
    },
    isCurrent: (requestId: number) => requestId === current,
    invalidate: () => {
      current += 1
    },
  }
}
