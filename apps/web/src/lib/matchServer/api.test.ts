import { describe, expect, it } from 'vitest'
import { GameModeId } from '@open-darts/game/types/gameMode'
import {
  buildInviteAbsoluteUrl,
  buildInvitePath,
  buildMatchPath,
  buildV1CreateMatchBody,
} from './api'
import { MatchPlayerSlot, V1_ONLINE_X01_CONFIG } from './types'

describe('matchServer api helpers', () => {
  it('builds v1 create-match bodies for 501 only', () => {
    expect(buildV1CreateMatchBody(3, MatchPlayerSlot.Joiner)).toEqual({
      mode: GameModeId.X01,
      config: { ...V1_ONLINE_X01_CONFIG },
      legsToWin: 3,
      startingPlayerSlot: MatchPlayerSlot.Joiner,
    })
  })

  it('builds invite and match paths under the app router', () => {
    const token = '11111111-1111-1111-1111-111111111111'
    const matchId = '22222222-2222-2222-2222-222222222222'

    expect(buildInvitePath(token)).toBe(`/match/join/${token}`)
    expect(buildMatchPath(matchId)).toBe(`/match/${matchId}`)
    expect(buildInviteAbsoluteUrl(token, 'https://example.com', '/tools/open-darts/')).toBe(
      `https://example.com/tools/open-darts/match/join/${token}`,
    )
  })
})
