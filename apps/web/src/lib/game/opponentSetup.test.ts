import { describe, expect, it } from 'vitest'
import { ChallengeLegEndMode } from '../../types/match'
import { PlayerKind } from '../../types/player'
import {
  appendOpponentSetupParams,
  buildPlayersFromOpponentSetup,
  parseOpponentSetup,
  playersMatchLaunchSetup,
} from './opponentSetup'
import { createSoloHumanPlayer } from './playerFactory'

describe('opponentSetup', () => {
  it('builds solo, guest, and challenge player lists', () => {
    expect(
      buildPlayersFromOpponentSetup({
        mode: 'solo',
        guestName: '',
        maxVisits: 9,
        legEndMode: ChallengeLegEndMode.PlayToCheckout,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toHaveLength(1)
    expect(
      buildPlayersFromOpponentSetup({
        mode: 'guest',
        guestName: 'Alex',
        maxVisits: 9,
        legEndMode: ChallengeLegEndMode.PlayToCheckout,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toMatchObject([
      { name: 'You', kind: PlayerKind.Human },
      { name: 'Alex', kind: PlayerKind.Human },
    ])
    expect(
      buildPlayersFromOpponentSetup(
        {
          mode: 'solo',
          guestName: '',
          maxVisits: 9,
          legEndMode: ChallengeLegEndMode.PlayToCheckout,
          legsToWin: 1,
          startingPlayerIndex: 0,
        },
        'Alex',
      ),
    ).toMatchObject([{ name: 'Alex', kind: PlayerKind.Human }])
    expect(
      buildPlayersFromOpponentSetup({
        mode: 'challenge',
        guestName: '',
        maxVisits: 8,
        legEndMode: ChallengeLegEndMode.StopAtLimit,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toHaveLength(1)
  })

  it('parses and serializes challenge params', () => {
    const params = appendOpponentSetupParams(new URLSearchParams('preset=501'), {
      mode: 'challenge',
      guestName: '',
      maxVisits: 6,
      legEndMode: ChallengeLegEndMode.StopAtLimit,
      legsToWin: 3,
      startingPlayerIndex: 0,
    })

    expect(parseOpponentSetup(params, 2, 501)).toEqual({
      mode: 'challenge',
      guestName: '',
      maxVisits: 6,
      legEndMode: ChallengeLegEndMode.StopAtLimit,
      legsToWin: 3,
      startingPlayerIndex: 0,
    })
  })

  it('matches launch setup without comparing player ids', () => {
    const players = [createSoloHumanPlayer()]

    expect(
      playersMatchLaunchSetup(players, {
        mode: 'challenge',
        guestName: '',
        maxVisits: 9,
        legEndMode: ChallengeLegEndMode.PlayToCheckout,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toBe(true)

    expect(
      playersMatchLaunchSetup(players, {
        mode: 'guest',
        guestName: 'Alex',
        maxVisits: 9,
        legEndMode: ChallengeLegEndMode.PlayToCheckout,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toBe(false)
  })

  it('defaults guest name when serializing guest mode', () => {
    const params = appendOpponentSetupParams(new URLSearchParams(), {
      mode: 'guest',
      guestName: '   ',
      maxVisits: 9,
      legEndMode: ChallengeLegEndMode.PlayToCheckout,
      legsToWin: 1,
      startingPlayerIndex: 0,
    })

    expect(params.get('guestName')).toBe('Guest')
  })
})
