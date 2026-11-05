export const HISTORY_PAGE_SIZE = 30

export interface HistorySortableEntry {
  id: string
  sortAt: string
}

export interface HistoryPageSlice<T extends HistorySortableEntry> {
  entries: T[]
  hasMore: boolean
}

/**
 * Merge already-sorted local and online streams (newest first) into one
 * chronological page without requiring every online payload up front.
 */
export const takeMergedHistoryPage = <T extends HistorySortableEntry>(
  localEntries: readonly T[],
  onlineEntries: readonly T[],
  limit: number = HISTORY_PAGE_SIZE,
): HistoryPageSlice<T> => {
  if (limit <= 0) {
    return { entries: [], hasMore: localEntries.length > 0 || onlineEntries.length > 0 }
  }

  const entries: T[] = []
  let localIndex = 0
  let onlineIndex = 0

  while (
    entries.length < limit &&
    (localIndex < localEntries.length || onlineIndex < onlineEntries.length)
  ) {
    const local = localEntries[localIndex]
    const online = onlineEntries[onlineIndex]

    if (local === undefined) {
      entries.push(online)
      onlineIndex += 1
      continue
    }

    if (online === undefined) {
      entries.push(local)
      localIndex += 1
      continue
    }

    if (online.sortAt.localeCompare(local.sortAt) > 0) {
      entries.push(online)
      onlineIndex += 1
    } else if (online.sortAt.localeCompare(local.sortAt) < 0) {
      entries.push(local)
      localIndex += 1
    } else if (online.id.localeCompare(local.id) > 0) {
      entries.push(online)
      onlineIndex += 1
    } else {
      entries.push(local)
      localIndex += 1
    }
  }

  return {
    entries,
    hasMore: localIndex < localEntries.length || onlineIndex < onlineEntries.length,
  }
}

export const getDateRangeCompletedAfter = (dateRange: 'all' | '7d' | '30d'): string | null => {
  if (dateRange === 'all') {
    return null
  }

  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - (dateRange === '7d' ? 7 : 30))
  return cutoff.toISOString()
}
