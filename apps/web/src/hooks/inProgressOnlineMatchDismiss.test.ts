import { describe, expect, it } from 'vitest'
import { applyDismissedInProgressMatch } from './inProgressOnlineMatchDismiss'
import { MatchStatus } from '../lib/matchServer/types'
import type { InProgressOnlineMatchRow } from '../lib/matchServer/types'

const waiting = (id: string): InProgressOnlineMatchRow => ({
  id,
  status: MatchStatus.Waiting,
  mode: 'x01',
  legs_to_win: 1,
  invite_token: 'invite-1',
})

describe('applyDismissedInProgressMatch', () => {
  it('hides a cancelled lobby while the index is still stale', () => {
    expect(applyDismissedInProgressMatch(waiting('match-1'), 'match-1')).toEqual({
      match: null,
      keepDismissed: true,
    })
  })

  it('clears dismiss once the index drops the lobby or a new match appears', () => {
    expect(applyDismissedInProgressMatch(null, 'match-1')).toEqual({
      match: null,
      keepDismissed: false,
    })
    expect(applyDismissedInProgressMatch(waiting('match-2'), 'match-1')).toEqual({
      match: waiting('match-2'),
      keepDismissed: false,
    })
  })
})
