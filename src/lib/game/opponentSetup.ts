import type { GameSession } from '../../types/gameSession'
import { DEFAULT_BOT_SKILL_LEVEL, PlayerKind } from '../../types/player'
import type { BotSkillLevel, Player } from '../../types/player'
import { normalizeBotSkillLevel, parseBotSkillLevel } from '../bots/botSkill'
import type { MatchFormat } from './matchLegs'
import {
  clampLegsToWin,
  clampStartingPlayerIndex,
  DEFAULT_MATCH_FORMAT,
  matchFormatsEqual,
  parseLegsToWin,
  parseStartingPlayerIndex,
} from './matchLegs'
import { createBotPlayer, createGuestPlayer, createSoloHumanPlayer } from './playerFactory'

export type OpponentMode = 'solo' | 'guest' | 'bot'

export interface OpponentSetup extends MatchFormat {
  mode: OpponentMode
  guestName: string
  botLevel: BotSkillLevel
}

export const DEFAULT_OPPONENT_SETUP: OpponentSetup = {
  mode: 'solo',
  guestName: '',
  botLevel: DEFAULT_BOT_SKILL_LEVEL,
  ...DEFAULT_MATCH_FORMAT,
}

const opponentModes = new Set<string>(['solo', 'guest', 'bot'])

export const isOpponentMode = (value: string): value is OpponentMode => opponentModes.has(value)

export const parseOpponentSetup = (params: URLSearchParams, playerCount = 2): OpponentSetup => {
  const modeParam = params.get('opponent')
  const mode = modeParam !== null && isOpponentMode(modeParam) ? modeParam : 'solo'
  const guestName = params.get('guestName')?.trim() ?? ''
  const effectivePlayerCount = mode === 'solo' ? 1 : playerCount

  return {
    mode,
    guestName,
    botLevel: parseBotSkillLevel(params.get('botLevel')),
    legsToWin: parseLegsToWin(params.get('legs')),
    startingPlayerIndex: parseStartingPlayerIndex(params.get('starter'), effectivePlayerCount),
  }
}

export const appendOpponentSetupParams = (
  params: URLSearchParams,
  setup: OpponentSetup,
): URLSearchParams => {
  const legsToWin = clampLegsToWin(setup.legsToWin)

  if (setup.mode === 'solo') {
    params.delete('opponent')
    params.delete('guestName')
    params.delete('botLevel')
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
  } else {
    params.delete('guestName')
  }

  if (setup.mode === 'bot') {
    params.set('botLevel', String(normalizeBotSkillLevel(setup.botLevel)))
  } else {
    params.delete('botLevel')
  }

  if (legsToWin === DEFAULT_MATCH_FORMAT.legsToWin) {
    params.delete('legs')
  } else {
    params.set('legs', String(legsToWin))
  }

  const startingPlayerIndex = clampStartingPlayerIndex(setup.startingPlayerIndex, 2)

  if (startingPlayerIndex === 0) {
    params.delete('starter')
  } else {
    params.set('starter', '1')
  }

  return params
}

export const buildPlayersFromOpponentSetup = (
  setup: OpponentSetup,
  humanName?: string,
): Player[] => {
  const human = createSoloHumanPlayer(humanName)

  if (setup.mode === 'solo') {
    return [human]
  }

  if (setup.mode === 'guest') {
    const guestName = setup.guestName.trim() || 'Guest'

    return [human, createGuestPlayer(guestName)]
  }

  return [human, createBotPlayer(normalizeBotSkillLevel(setup.botLevel))]
}

export const getOpponentSetupFromPlayers = (players: Player[]): OpponentSetup => {
  if (players.length <= 1) {
    return DEFAULT_OPPONENT_SETUP
  }

  const [, opponent] = players

  if (opponent === undefined) {
    return DEFAULT_OPPONENT_SETUP
  }

  if (opponent.kind === PlayerKind.Bot) {
    return {
      mode: 'bot',
      guestName: '',
      botLevel: normalizeBotSkillLevel(opponent.botLevel),
      ...DEFAULT_MATCH_FORMAT,
    }
  }

  return {
    mode: 'guest',
    guestName: opponent.name,
    botLevel: DEFAULT_BOT_SKILL_LEVEL,
    ...DEFAULT_MATCH_FORMAT,
  }
}

export const getOpponentSetupFromSession = (
  session: Pick<GameSession, 'players' | 'matchProgress'>,
): OpponentSetup => {
  const base = getOpponentSetupFromPlayers(session.players)

  return {
    ...base,
    legsToWin: session.matchProgress?.legsToWin ?? DEFAULT_MATCH_FORMAT.legsToWin,
    startingPlayerIndex: session.matchProgress?.startingPlayerIndex ?? 0,
  }
}

export const opponentSetupsMatch = (left: OpponentSetup, right: OpponentSetup): boolean =>
  left.mode === right.mode &&
  left.guestName === right.guestName &&
  normalizeBotSkillLevel(left.botLevel) === normalizeBotSkillLevel(right.botLevel) &&
  matchFormatsEqual(left, right)

export const playersMatchLaunchSetup = (players: Player[], setup: OpponentSetup): boolean => {
  const [primaryHuman] = players
  const humanName = primaryHuman?.kind === PlayerKind.Human ? primaryHuman.name : undefined
  const expected = buildPlayersFromOpponentSetup(setup, humanName)

  if (players.length !== expected.length) {
    return false
  }

  return players.every((player, index) => {
    const expectedPlayer = expected[index]

    if (expectedPlayer === undefined) {
      return false
    }

    return (
      player.kind === expectedPlayer.kind &&
      player.name === expectedPlayer.name &&
      normalizeBotSkillLevel(player.botLevel) === normalizeBotSkillLevel(expectedPlayer.botLevel)
    )
  })
}
