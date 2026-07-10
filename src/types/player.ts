export enum PlayerKind {
  Human = 'human',
  Bot = 'bot',
  Remote = 'remote',
}

export const BOT_SKILL_LEVEL_MIN = 1
export const BOT_SKILL_LEVEL_MAX = 10
export const DEFAULT_BOT_SKILL_LEVEL = 5

/** Bot difficulty from 1 (weakest) to 10 (strongest). */
export type BotSkillLevel = number

export interface Player {
  id: string
  name: string
  kind: PlayerKind
  botLevel?: BotSkillLevel
}
