import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import { aroundTheClockEngine } from '../aroundTheClock/aroundTheClockEngine'
import { bob27Engine } from '../bob27/bob27Engine'
import { oneTwentyOneEngine } from '../oneTwentyOne/oneTwentyOneEngine'
import { tenUpOneDownEngine } from '../tenUpOneDown/tenUpOneDownEngine'
import { x01Engine } from '../x01/x01Engine'
import type { GameEngine } from './GameEngine'

export const getEngine = (mode: GameModeId): GameEngine<unknown, GameConfig> => {
  switch (mode) {
    case GameModeId.X01:
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine config matches session mode
      return x01Engine as GameEngine<unknown, GameConfig>
    case GameModeId.Bob27:
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine config matches session mode
      return bob27Engine as GameEngine<unknown, GameConfig>
    case GameModeId.OneTwentyOne:
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine config matches session mode
      return oneTwentyOneEngine as GameEngine<unknown, GameConfig>
    case GameModeId.AroundTheClock:
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine config matches session mode
      return aroundTheClockEngine as GameEngine<unknown, GameConfig>
    case GameModeId.TenUpOneDown:
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- engine config matches session mode
      return tenUpOneDownEngine as GameEngine<unknown, GameConfig>
    default: {
      const exhaustive: never = mode
      throw new Error(`Unknown game mode: ${String(exhaustive)}`)
    }
  }
}
