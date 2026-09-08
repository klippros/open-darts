import { describe, expect, it } from 'vitest'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { parseCreateMatchRequest } from '../src/http/parseCreateMatch'
import { STARTING_PLAYER_SLOT_RANDOM } from '../src/match/types'

describe('parseCreateMatchRequest', () => {
  const base = {
    mode: GameModeId.X01,
    config: defaultX01Config(),
    legsToWin: 2,
  }

  it('accepts creator, joiner, and random starting slots', () => {
    expect(parseCreateMatchRequest({ ...base, startingPlayerSlot: 0 })?.startingPlayerSlot).toBe(0)
    expect(parseCreateMatchRequest({ ...base, startingPlayerSlot: 1 })?.startingPlayerSlot).toBe(1)
    expect(
      parseCreateMatchRequest({ ...base, startingPlayerSlot: STARTING_PLAYER_SLOT_RANDOM })
        ?.startingPlayerSlot,
    ).toBe(STARTING_PLAYER_SLOT_RANDOM)
  })

  it('rejects invalid starting slots', () => {
    expect(parseCreateMatchRequest({ ...base, startingPlayerSlot: 3 })).toBeNull()
    expect(parseCreateMatchRequest({ ...base, startingPlayerSlot: -1 })).toBeNull()
    expect(parseCreateMatchRequest({ ...base, startingPlayerSlot: '0' })).toBeNull()
  })
})
