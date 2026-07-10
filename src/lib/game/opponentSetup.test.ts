import { describe, expect, it } from 'vitest'
import { PlayerKind } from '../../types/player'
import {
  appendOpponentSetupParams,
  buildPlayersFromOpponentSetup,
  parseOpponentSetup,
  playersMatchLaunchSetup,
} from './opponentSetup'
import { createBotPlayer, createSoloHumanPlayer } from './playerFactory'

describe('opponentSetup', () => {
  it('builds solo, guest, and bot player lists', () => {
    expect(
      buildPlayersFromOpponentSetup({ mode: 'solo', guestName: '', botLevel: 5, legsToWin: 1, startingPlayerIndex: 0 }),
    ).toHaveLength(1)
    expect(
      buildPlayersFromOpponentSetup({
        mode: 'guest',
        guestName: 'Alex',
        botLevel: 5,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toMatchObject([
      { name: 'You', kind: PlayerKind.Human },
      { name: 'Alex', kind: PlayerKind.Human },
    ])
    expect(
      buildPlayersFromOpponentSetup(
        { mode: 'solo', guestName: '', botLevel: 5, legsToWin: 1, startingPlayerIndex: 0 },
        'Alex',
      ),
    ).toMatchObject([{ name: 'Alex', kind: PlayerKind.Human }])
    expect(
      buildPlayersFromOpponentSetup({
        mode: 'bot',
        guestName: '',
        botLevel: 8,
        legsToWin: 1,
        startingPlayerIndex: 0,
      })[1],
    ).toMatchObject({
      kind: PlayerKind.Bot,
      botLevel: 8,
      name: 'Dart Bot (Level 8)',
    })
  })

  it('parses and serializes opponent params', () => {
    const params = appendOpponentSetupParams(new URLSearchParams('preset=501'), {
      mode: 'bot',
      guestName: '',
      botLevel: 6,
      legsToWin: 3,
      startingPlayerIndex: 1,
    })

    expect(parseOpponentSetup(params)).toEqual({
      mode: 'bot',
      guestName: '',
      botLevel: 6,
      legsToWin: 3,
      startingPlayerIndex: 1,
    })
  })

  it('matches launch setup without comparing player ids', () => {
    const players = [createSoloHumanPlayer(), createBotPlayer(3)]

    expect(
      playersMatchLaunchSetup(players, {
        mode: 'bot',
        guestName: '',
        botLevel: 3,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toBe(true)

    expect(
      playersMatchLaunchSetup(players, {
        mode: 'guest',
        guestName: 'Alex',
        botLevel: 3,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toBe(false)
  })

  it('matches launch setup using the saved primary human name', () => {
    const players = [createSoloHumanPlayer('Alex'), createBotPlayer(3)]

    expect(
      playersMatchLaunchSetup(players, {
        mode: 'bot',
        guestName: '',
        botLevel: 3,
        legsToWin: 1,
        startingPlayerIndex: 0,
      }),
    ).toBe(true)
  })

  it('defaults guest name when serializing guest mode', () => {
    const params = appendOpponentSetupParams(new URLSearchParams(), {
      mode: 'guest',
      guestName: '   ',
      botLevel: 5,
      legsToWin: 1,
      startingPlayerIndex: 0,
    })

    expect(params.get('guestName')).toBe('Guest')
  })
})
