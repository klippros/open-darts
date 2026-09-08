import { describe, expect, it } from 'vitest'
import { resolveStartingPlayerSlot } from '../src/match/sessionPlay'
import { STARTING_PLAYER_SLOT_RANDOM } from '../src/match/types'

describe('resolveStartingPlayerSlot', () => {
  it('keeps concrete creator and joiner preferences', () => {
    expect(resolveStartingPlayerSlot(0)).toBe(0)
    expect(resolveStartingPlayerSlot(1)).toBe(1)
  })

  it('resolves random to a coin flip', () => {
    expect(resolveStartingPlayerSlot(STARTING_PLAYER_SLOT_RANDOM, () => 0)).toBe(0)
    expect(resolveStartingPlayerSlot(STARTING_PLAYER_SLOT_RANDOM, () => 1)).toBe(1)
  })
})
