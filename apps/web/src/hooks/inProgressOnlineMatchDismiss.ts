import type { InProgressOnlineMatchRow } from '../lib/matchServer/types'

/** Apply optimistic cancel dismiss against a freshly fetched in-progress row. */
export const applyDismissedInProgressMatch = (
  match: InProgressOnlineMatchRow | null,
  dismissedMatchId: string | null,
): { match: InProgressOnlineMatchRow | null; keepDismissed: boolean } => {
  if (match !== null && match.id === dismissedMatchId) {
    return { match: null, keepDismissed: true }
  }

  return { match, keepDismissed: false }
}
