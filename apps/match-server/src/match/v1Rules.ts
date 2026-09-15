import { GameModeId } from '@open-darts/game/types/gameMode'
import type { JsonObject } from '../json'

const x01Mode: string = GameModeId.X01

export const isV1OnlineMatchSetup = (mode: string, config: JsonObject): boolean =>
  mode === x01Mode &&
  config.startScore === 501 &&
  config.doubleIn === false &&
  config.doubleOut === true
