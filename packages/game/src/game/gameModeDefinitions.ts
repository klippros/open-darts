import { GameModeId } from '../types/gameMode'
import type { GameConfig } from '../types/gameMode'
import type { AroundTheClockConfig } from '../types/aroundTheClock'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import type { ClaimTheBoardConfig } from '../types/claimTheBoard'
import type { Bob27Config } from '../types/bob27'
import type { HunterConfig } from '../types/hunter'
import type { TenUpOneDownConfig } from '../types/tenUpOneDown'
import { DEFAULT_CLAIM_THE_BOARD_CONFIG } from '../claimTheBoard/claimTheBoardConfig'
import { DEFAULT_HUNTER_CONFIG } from '../hunter/hunterConfig'
import { DEFAULT_ONE_TWENTY_ONE_CONFIG } from '../oneTwentyOne/oneTwentyOneConfig'
import { DEFAULT_NINETY_NINE_DARTS_CONFIG } from '../ninetyNineDarts/ninetyNineDartsConfig'
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
    defaultConfig: DEFAULT_ONE_TWENTY_ONE_CONFIG,
    label: '121',
    description: 'Lives ladder from 121',
  },
  [GameModeId.AroundTheClock]: {
    mode: GameModeId.AroundTheClock,
    defaultConfig: {
      finishOnBull: true,
      aimMode: AroundTheClockAimMode.Any,
    } satisfies AroundTheClockConfig,
    label: 'Around the Clock',
    description: 'Hit 1 to 20; finish on 25/bull or bull',
  },
  [GameModeId.ClaimTheBoard]: {
    mode: GameModeId.ClaimTheBoard,
    defaultConfig: DEFAULT_CLAIM_THE_BOARD_CONFIG satisfies ClaimTheBoardConfig,
    label: 'Claim the Board',
    description: 'Shared targets · highest score wins · finish hits break ties',
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
  [GameModeId.NinetyNineDarts]: {
    mode: GameModeId.NinetyNineDarts,
    defaultConfig: DEFAULT_NINETY_NINE_DARTS_CONFIG,
    label: '99 Darts',
    description: '99 darts at a chosen target',
  },
  [GameModeId.Hunter]: {
    mode: GameModeId.Hunter,
    defaultConfig: DEFAULT_HUNTER_CONFIG satisfies HunterConfig,
    label: 'Hunter',
    description: 'Chase around the board · land on or pass your opponent to win',
  },
}

export const getDefaultConfig = (mode: GameModeId): GameConfig =>
  gameModeDefinitions[mode].defaultConfig

export const showsVisitHistory = (_mode: GameModeId): boolean => true

export const supportsScoreCaller = (mode: GameModeId): boolean =>
  mode !== GameModeId.AroundTheClock &&
  mode !== GameModeId.ClaimTheBoard &&
  mode !== GameModeId.NinetyNineDarts &&
  mode !== GameModeId.Hunter

export const supportsVisitScoreInput = (mode: GameModeId): boolean =>
  mode === GameModeId.X01 || mode === GameModeId.OneTwentyOne || mode === GameModeId.TenUpOneDown
