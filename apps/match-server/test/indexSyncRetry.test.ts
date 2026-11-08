import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { computeIndexSyncRetryDelayMs, INDEX_SYNC_RETRY_MAX_MS } from '../src/match/constants'
import { MatchObject } from '../src/match/MatchObject'
import {
  bumpIndexSyncRetry,
  clearIndexSyncPending,
  hasIndexSyncPending,
  markIndexSyncPending,
} from '../src/match/schema'
import { DeadlineKind, MatchCommandName, MatchEndingKind, MatchStatus } from '../src/match/types'
import { creatorUserId, initWaitingMatch } from './helpers'

describe('index sync retry helpers', () => {
  it('uses exponential backoff capped at the max delay', () => {
    expect(computeIndexSyncRetryDelayMs(1)).toBe(1_000)
    expect(computeIndexSyncRetryDelayMs(2)).toBe(2_000)
    expect(computeIndexSyncRetryDelayMs(3)).toBe(4_000)
    expect(computeIndexSyncRetryDelayMs(20)).toBe(INDEX_SYNC_RETRY_MAX_MS)
  })
})

describe('index sync retry durable state', () => {
  it('tracks pending versions and retry counts in DO storage', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (instance: MatchObject, state) => {
      expect(instance).toBeInstanceOf(MatchObject)
      const sql = state.storage.sql

      expect(hasIndexSyncPending(sql)).toBe(false)
      markIndexSyncPending(sql, 7)
      expect(hasIndexSyncPending(sql)).toBe(true)
      expect(bumpIndexSyncRetry(sql)).toBe(1)
      expect(bumpIndexSyncRetry(sql)).toBe(2)
      clearIndexSyncPending(sql, 7)
      expect(hasIndexSyncPending(sql)).toBe(false)
    })
  })

  it('does not clear a newer pending version when an older publish finishes', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      const sql = state.storage.sql
      markIndexSyncPending(sql, 7)
      clearIndexSyncPending(sql, 6)
      expect(hasIndexSyncPending(sql)).toBe(true)

      clearIndexSyncPending(sql, 7)
      expect(hasIndexSyncPending(sql)).toBe(false)
    })
  })

  it('clears pending index sync when the retry alarm publishes successfully', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      const sql = state.storage.sql
      markIndexSyncPending(sql, 1)
      sql.exec(
        `
          INSERT INTO deadlines (kind, fire_at) VALUES (?, 0)
          ON CONFLICT(kind) DO UPDATE SET fire_at = 0
        `,
        DeadlineKind.IndexSyncRetry,
      )
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    expect(await runDurableObjectAlarm(stub)).toBe(true)

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      expect(hasIndexSyncPending(state.storage.sql)).toBe(false)
      const retryDeadline = state.storage.sql
        .exec<{ kind: string }>(
          'SELECT kind FROM deadlines WHERE kind = ?',
          DeadlineKind.IndexSyncRetry,
        )
        .toArray()
      expect(retryDeadline).toEqual([])
    })

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Waiting)
  })

  it('retains an index sync retry deadline for terminal matches while publish is still pending', async () => {
    const stub = await initWaitingMatch()

    await runInDurableObject(stub, async (_instance: MatchObject, state) => {
      const sql = state.storage.sql
      sql.exec(
        'UPDATE match_state SET status = ?, ending_kind = ?',
        MatchStatus.Cancelled,
        MatchEndingKind.CreatorCancel,
      )
      sql.exec('DELETE FROM deadlines')
      markIndexSyncPending(sql, 9)
      sql.exec(
        'INSERT INTO deadlines (kind, fire_at) VALUES (?, ?)',
        DeadlineKind.IndexSyncRetry,
        Date.now() + 30_000,
      )
      await state.storage.setAlarm(Date.now() + 30_000)
    })

    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Cancelled)

    await runInDurableObject(stub, async (_instance: MatchObject, durableState) => {
      expect(hasIndexSyncPending(durableState.storage.sql)).toBe(true)
      const retry = durableState.storage.sql
        .exec<{ kind: string; fire_at: number }>(
          'SELECT kind, fire_at FROM deadlines WHERE kind = ?',
          DeadlineKind.IndexSyncRetry,
        )
        .toArray()
      expect(retry).toHaveLength(1)
      expect(await durableState.storage.getAlarm()).not.toBeNull()
    })
  })
})
