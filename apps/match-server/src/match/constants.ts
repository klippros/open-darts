export const WAITING_TIMEOUT_MS = 30 * 60 * 1000

export const FINALIZE_TIMEOUT_MS = 30 * 1000

export const ASYNC_DEADLINE_MS = 24 * 60 * 60 * 1000

/** Cancel active sync matches after this long with no play interaction. */
export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000

/** Opponent must stay disconnected this long before start_async is allowed. */
export const ASYNC_DISCONNECT_MS = 30 * 1000

/** Opponent's current turn must last this long before start_async is allowed. */
export const ASYNC_VISIT_STALL_MS = 60 * 1000

export const INDEX_SYNC_RETRY_BASE_MS = 1_000

export const INDEX_SYNC_RETRY_MAX_MS = 60_000

export const computeIndexSyncRetryDelayMs = (retryCount: number): number =>
  Math.min(INDEX_SYNC_RETRY_MAX_MS, INDEX_SYNC_RETRY_BASE_MS * 2 ** Math.max(retryCount - 1, 0))

export const MATCH_USER_HEADER = 'x-match-user-id'
