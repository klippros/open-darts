import { afterEach, describe, expect, it, vi } from 'vitest'
import { OnlineMatchInviteOutcome, OnlineMatchInviteStatus } from './types'

const rpc = vi.fn()

vi.mock('../supabase/client', () => ({
  supabaseClient: {
    get rpc() {
      return rpc
    },
  },
}))

afterEach(() => {
  rpc.mockReset()
})

describe('inviteApi response parsing', () => {
  it('parses structured accept outcomes for join and unavailable', async () => {
    const { respondOnlineMatchInvite } = await import('./inviteApi')

    rpc.mockResolvedValueOnce({
      data: {
        match_id: '20000000-0000-4000-8000-000000000010',
        invite_token: '30000000-0000-4000-8000-000000000010',
        outcome: OnlineMatchInviteOutcome.AcceptedForJoin,
      },
      error: null,
    })

    await expect(respondOnlineMatchInvite('invite-1', true)).resolves.toEqual({
      matchId: '20000000-0000-4000-8000-000000000010',
      inviteToken: '30000000-0000-4000-8000-000000000010',
      outcome: OnlineMatchInviteOutcome.AcceptedForJoin,
    })

    rpc.mockResolvedValueOnce({
      data: {
        match_id: '20000000-0000-4000-8000-000000000010',
        invite_token: null,
        outcome: OnlineMatchInviteOutcome.Unavailable,
      },
      error: null,
    })

    await expect(respondOnlineMatchInvite('invite-1', true)).resolves.toEqual({
      matchId: '20000000-0000-4000-8000-000000000010',
      inviteToken: null,
      outcome: OnlineMatchInviteOutcome.Unavailable,
    })
  })

  it('parses host invite status rows including superseded', async () => {
    const { listOnlineMatchInvitesForMatch } = await import('./inviteApi')

    rpc.mockResolvedValueOnce({
      data: [
        {
          invite_id: 'invite-1',
          invitee_user_id: 'user-1',
          invitee_display_name: 'Alice',
          status: OnlineMatchInviteStatus.Superseded,
          created_at: '2026-11-08T00:00:00.000Z',
          responded_at: null,
          resolved_at: '2026-11-08T00:01:00.000Z',
        },
      ],
      error: null,
    })

    await expect(listOnlineMatchInvitesForMatch('match-1')).resolves.toEqual([
      {
        inviteId: 'invite-1',
        inviteeUserId: 'user-1',
        inviteeDisplayName: 'Alice',
        status: OnlineMatchInviteStatus.Superseded,
        createdAt: '2026-11-08T00:00:00.000Z',
        respondedAt: null,
        resolvedAt: '2026-11-08T00:01:00.000Z',
      },
    ])
  })

  it('maps mutual-follow invite rejection to a generic player-facing error', async () => {
    const { createOnlineMatchInvite } = await import('./inviteApi')

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'invite not allowed' },
    })

    await expect(createOnlineMatchInvite('match-1', 'user-2')).rejects.toMatchObject({
      name: 'InviteApiError',
      code: 'invite_not_allowed',
      message: "This player isn't accepting invites from you.",
    })
  })
})
