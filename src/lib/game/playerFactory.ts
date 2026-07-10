import { PlayerKind } from '../../types/player'
import type { BotSkillLevel } from '../../types/player'

export const createId = (): string => crypto.randomUUID()

export const createPlayer = (
  name: string,
  kind: PlayerKind = PlayerKind.Human,
  id = createId(),
  botLevel?: BotSkillLevel,
) => ({
  id,
  name,
  kind,
  ...(botLevel === undefined ? {} : { botLevel }),
})

export const DEFAULT_HUMAN_PLAYER_NAME = 'You'

export const resolveHumanPlayerName = (displayName?: string | null): string => {
  const trimmed = displayName?.trim()

  if (trimmed === undefined || trimmed === '') {
    return DEFAULT_HUMAN_PLAYER_NAME
  }

  return trimmed
}

export const createHumanPlayer = (name = DEFAULT_HUMAN_PLAYER_NAME) =>
  createPlayer(name, PlayerKind.Human)

export const createSoloHumanPlayer = (humanName?: string) =>
  createHumanPlayer(resolveHumanPlayerName(humanName))

export const createGuestPlayer = (name: string) => createPlayer(name, PlayerKind.Human)

export const createBotPlayer = (level: BotSkillLevel, id = createId()) =>
  createPlayer(`Dart Bot (Level ${level})`, PlayerKind.Bot, id, level)
