import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { AroundTheClockConfig } from '../../types/aroundTheClock'
import type { Bob27Config } from '../../types/bob27'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import type { TenUpOneDownConfig } from '../../types/tenUpOneDown'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'

export interface GameModeDefinition {
  mode: GameModeId
  defaultConfig: GameConfig
  label: string
  description: string
}

export const gameModeDefinitions: Record<GameModeId, GameModeDefinition> = {
  [GameModeId.X01]: {
    mode: GameModeId.X01,
    defaultConfig: x01PresetConfigs[X01PresetId.FiveOhOne],
    label: '501',
    description: 'Classic double-out',
  },
  [GameModeId.Bob27]: {
    mode: GameModeId.Bob27,
    defaultConfig: {
      startScore: 27,
    } satisfies Bob27Config,
    label: "Bob's 27",
    description: 'Doubles practice',
  },
  [GameModeId.OneTwentyOne]: {
    mode: GameModeId.OneTwentyOne,
    defaultConfig: {
      startScore: 121,
      increment: 20,
      doubleOut: true,
    } satisfies OneTwentyOneConfig,
    label: '121',
    description: 'Checkout practice',
  },
  [GameModeId.AroundTheClock]: {
    mode: GameModeId.AroundTheClock,
    defaultConfig: {
      finishOnBull: true,
    } satisfies AroundTheClockConfig,
    label: 'Around the Clock',
    description: 'Hit 1 to 20 and bull',
  },
  [GameModeId.TenUpOneDown]: {
    mode: GameModeId.TenUpOneDown,
    defaultConfig: {
      startScore: 60,
      incrementUp: 10,
      decrementDown: 1,
      minScore: 2,
      doubleOut: true,
    } satisfies TenUpOneDownConfig,
    label: '10 Up 1 Down',
    description: 'Checkout up or down',
  },
}

export const getDefaultConfig = (mode: GameModeId): GameConfig =>
  gameModeDefinitions[mode].defaultConfig

export const showsVisitHistory = (_mode: GameModeId): boolean => true
