import { describe, expect, it } from 'vitest'
import {
  PENDING_INVITE_VISIBLE_LIMIT,
  selectVisiblePendingInvites,
} from './pendingInviteVisibility'

describe('selectVisiblePendingInvites', () => {
  it('bounds the collapsed inbox and reports hidden count', () => {
    const invites = [1, 2, 3, 4, 5]
    expect(selectVisiblePendingInvites(invites, false)).toEqual({
      visible: [1, 2, 3],
      hiddenCount: 2,
    })
    expect(PENDING_INVITE_VISIBLE_LIMIT).toBe(3)
  })

  it('shows the full list when expanded', () => {
    const invites = [1, 2, 3, 4]
    expect(selectVisiblePendingInvites(invites, true)).toEqual({
      visible: [1, 2, 3, 4],
      hiddenCount: 0,
    })
  })
})
