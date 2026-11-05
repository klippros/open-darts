import { describe, expect, it } from 'vitest'
import {
  getDateRangeCompletedAfter,
  HISTORY_PAGE_SIZE,
  loadedHistoryCoversPage,
  takeMergedHistoryPage,
} from './historyPager'

const entry = (id: string, sortAt: string) => ({ id, sortAt })

describe('takeMergedHistoryPage', () => {
  it('returns an empty page when both streams are empty', () => {
    expect(takeMergedHistoryPage([], [], 30)).toEqual({ entries: [], hasMore: false })
  })

  it('merges local and online newest-first into pages of 30', () => {
    const local = Array.from({ length: 20 }, (_, index) =>
      entry(`local-${index}`, `2026-01-${String(40 - index).padStart(2, '0')}T00:00:00.000Z`),
    )
    const online = Array.from({ length: 25 }, (_, index) =>
      entry(`online-${index}`, `2026-01-${String(39 - index).padStart(2, '0')}T12:00:00.000Z`),
    )

    const first = takeMergedHistoryPage(local, online, HISTORY_PAGE_SIZE)
    expect(first.entries).toHaveLength(30)
    expect(first.hasMore).toBe(true)
    expect(first.entries[0]?.id).toBe('local-0')
    expect(first.entries[1]?.id).toBe('online-0')

    const remainingLocal = local.filter((item) => !first.entries.some((row) => row.id === item.id))
    const remainingOnline = online.filter(
      (item) => !first.entries.some((row) => row.id === item.id),
    )
    const second = takeMergedHistoryPage(remainingLocal, remainingOnline, HISTORY_PAGE_SIZE)

    expect(second.entries).toHaveLength(15)
    expect(second.hasMore).toBe(false)
  })

  it('breaks timestamp ties with id order', () => {
    const page = takeMergedHistoryPage(
      [entry('a', '2026-01-01T00:00:00.000Z')],
      [entry('b', '2026-01-01T00:00:00.000Z')],
      2,
    )

    expect(page.entries.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('avoids another online page only when local rows cover the online cursor', () => {
    const online = [
      entry('online-new', '2026-03-01T00:00:00.000Z'),
      entry('online-cursor', '2026-02-01T00:00:00.000Z'),
    ]
    const newerLocal = [
      entry('local-1', '2026-04-01T00:00:00.000Z'),
      entry('local-2', '2026-03-15T00:00:00.000Z'),
    ]
    const olderLocal = [
      entry('local-1', '2026-01-15T00:00:00.000Z'),
      entry('local-2', '2026-01-01T00:00:00.000Z'),
    ]
    const cursor = online[1]!

    expect(loadedHistoryCoversPage(newerLocal, online, 3, cursor)).toBe(true)
    expect(loadedHistoryCoversPage(olderLocal, online, 3, cursor)).toBe(false)
  })
})

describe('getDateRangeCompletedAfter', () => {
  it('returns null for all time', () => {
    expect(getDateRangeCompletedAfter('all')).toBeNull()
  })

  it('returns an ISO cutoff for 7d and 30d', () => {
    const seven = getDateRangeCompletedAfter('7d')
    const thirty = getDateRangeCompletedAfter('30d')

    expect(seven).not.toBeNull()
    expect(thirty).not.toBeNull()
    expect(Date.parse(seven as string)).toBeLessThan(Date.now())
    expect(Date.parse(thirty as string)).toBeLessThan(Date.parse(seven as string))
  })
})
