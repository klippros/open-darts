export const WAITING_TIMEOUT_MS = 30 * 60 * 1000

export const FINALIZE_TIMEOUT_MS = 30 * 1000

export const ASYNC_DEADLINE_MS = 24 * 60 * 60 * 1000

/** Opponent must stay disconnected this long before start_async is allowed. */
export const ASYNC_DISCONNECT_MS = 30 * 1000

/** Opponent's current turn must last this long before start_async is allowed. */
export const ASYNC_VISIT_STALL_MS = 60 * 1000

export const MATCH_USER_HEADER = 'x-match-user-id'
