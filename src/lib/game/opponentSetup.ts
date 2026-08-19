import type { GameSession } from '../../types/gameSession'
import { ChallengeLegEndMode, type ChallengeConfig } from '../../types/match'
import type { Player } from '../../types/player'
import {
  clampMaxVisits,
  createChallengeConfig,
  DEFAULT_MAX_VISITS,
  parseChallengeLegEndMode,
  parseMaxVisits,
} from './challenge'
import type { MatchFormat } from './matchLegs'
import {
  clampLegsToWin,
  clampStartingPlayerIndex,
  DEFAULT_MATCH_FORMAT,
  matchFormatsEqual,
  parseLegsToWin,
  parseStartingPlayerIndex,
} from './matchLegs'
import { createGuestPlayer, createSoloHumanPlayer } from './playerFactory'

export type OpponentMode = 'solo' | 'guest' | 'challenge'

export interface OpponentSetup extends MatchFormat {
  mode: OpponentMode
  guestName: string
  maxVisits: number
  legEndMode: ChallengeLegEndMode
}

export const DEFAULT_OPPONENT_SETUP: OpponentSetup = {
  mode: 'solo',
  guestName: '',
  maxVisits: DEFAULT_MAX_VISITS,
  legEndMode: ChallengeLegEndMode.PlayToCheckout,
  ...DEFAULT_MATCH_FORMAT,
}

const opponentModes = new Set<string>(['solo', 'guest', 'challenge'])

export const isOpponentMode = (value: string): value is OpponentMode => opponentModes.has(value)

export const parseOpponentSetup = (
  params: URLSearchParams,
  playerCount = 2,
  startScore = 501,
): OpponentSetup => {
  const modeParam = params.get('opponent')
  const mode = modeParam !== null && isOpponentMode(modeParam) ? modeParam : 'solo'
  const guestName = params.get('guestName')?.trim() ?? ''
  const effectivePlayerCount = mode === 'solo' || mode === 'challenge' ? 1 : playerCount

  return {
    mode,
    guestName,
    maxVisits: parseMaxVisits(params.get('maxVisits'), startScore),
    legEndMode: parseChallengeLegEndMode(params.get('challengeEnd')),
    legsToWin: parseLegsToWin(params.get('legs')),
    startingPlayerIndex: parseStartingPlayerIndex(params.get('starter'), effectivePlayerCount),
  }
}

export const getChallengeConfigFromSetup = (
  setup: OpponentSetup,
  startScore: number,
): ChallengeConfig | undefined => {
  if (setup.mode !== 'challenge') {
    return undefined
  }

  return createChallengeConfig(setup.maxVisits, setup.legEndMode, startScore)
}

export const appendOpponentSetupParams = (
  params: URLSearchParams,
  setup: OpponentSetup,
  startScore = 501,
): URLSearchParams => {
  const legsToWin = clampLegsToWin(setup.legsToWin)

  if (setup.mode === 'solo') {
    params.delete('opponent')
    params.delete('guestName')
    params.delete('maxVisits')
    params.delete('challengeEnd')
    params.delete('starter')

    if (legsToWin === DEFAULT_MATCH_FORMAT.legsToWin) {
      params.delete('legs')
    } else {
      params.set('legs', String(legsToWin))
    }

    return params
  }

  params.set('opponent', setup.mode)

  if (setup.mode === 'guest') {
    params.set('guestName', setup.guestName.trim() || 'Guest')
    params.delete('maxVisits')
    params.delete('challengeEnd')
  } else {
    params.delete('guestName')
    const maxVisits = clampMaxVisits(setup.maxVisits, startScore)

    if (maxVisits === DEFAULT_MAX_VISITS) {
      params.delete('maxVisits')
    } else {
      params.set('maxVisits', String(maxVisits))
    }

    if (setup.legEndMode === ChallengeLegEndMode.PlayToCheckout) {
      params.delete('challengeEnd')
    } else {
      params.set('challengeEnd', setup.legEndMode)
    }
  }

  if (legsToWin === DEFAULT_MATCH_FORMAT.legsToWin) {
    params.delete('legs')
  } else {
    params.set('legs', String(legsToWin))
  }

  if (setup.mode === 'guest') {
    const startingPlayerIndex = clampStartingPlayerIndex(setup.startingPlayerIndex, 2)

    if (startingPlayerIndex === 0) {
      params.delete('starter')
    } else {
      params.set('starter', '1')
    }
  } else {
    params.delete('starter')
  }

  return params
}

export const buildPlayersFromOpponentSetup = (
  setup: OpponentSetup,
  humanName?: string,
): Player[] => {
  const human = createSoloHumanPlayer(humanName)

  if (setup.mode === 'solo' || setup.mode === 'challenge') {
    return [human]
  }

  const guestName = setup.guestName.trim() || 'Guest'

  return [human, createGuestPlayer(guestName)]
}

export const getOpponentSetupFromSession = (
  session: Pick<GameSession, 'players' | 'matchProgress'>,
): OpponentSetup => {
  const { matchProgress } = session

  if (matchProgress?.challenge !== undefined) {
    return {
      mode: 'challenge',
      guestName: '',
      maxVisits: matchProgress.challenge.maxVisits,
      legEndMode: matchProgress.challenge.legEndMode,
      legsToWin: matchProgress.legsToWin,
      startingPlayerIndex: matchProgress.startingPlayerIndex,
    }
  }

  if (session.players.length <= 1) {
    return {
      ...DEFAULT_OPPONENT_SETUP,
      legsToWin: matchProgress?.legsToWin ?? DEFAULT_MATCH_FORMAT.legsToWin,
      startingPlayerIndex: matchProgress?.startingPlayerIndex ?? 0,
    }
  }

  const [, opponent] = session.players

  return {
    mode: 'guest',
    guestName: opponent?.name ?? 'Guest',
    maxVisits: DEFAULT_MAX_VISITS,
    legEndMode: ChallengeLegEndMode.PlayToCheckout,
    legsToWin: matchProgress?.legsToWin ?? DEFAULT_MATCH_FORMAT.legsToWin,
    startingPlayerIndex: matchProgress?.startingPlayerIndex ?? 0,
  }
}

export const opponentSetupsMatch = (left: OpponentSetup, right: OpponentSetup): boolean =>
  left.mode === right.mode &&
  left.guestName === right.guestName &&
  left.maxVisits === right.maxVisits &&
  left.legEndMode === right.legEndMode &&
  matchFormatsEqual(left, right)

export const playersMatchLaunchSetup = (players: Player[], setup: OpponentSetup): boolean => {
  const [primaryHuman] = players
  const humanName = primaryHuman?.name
  const expected = buildPlayersFromOpponentSetup(setup, humanName)

  if (players.length !== expected.length) {
    return false
  }

  return players.every((player, index) => {
    const expectedPlayer = expected[index]

    if (expectedPlayer === undefined) {
      return false
    }

    return player.kind === expectedPlayer.kind && player.name === expectedPlayer.name
  })
}
