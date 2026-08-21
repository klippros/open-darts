import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { getDartPickerHelpContent, getGameModePickerTargets } from './getGameModePickerTargets'

describe('getGameModePickerTargets', () => {
  it('reads Around the Clock target index for the active player', () => {
    expect(
      getGameModePickerTargets(
        GameModeId.AroundTheClock,
        { players: { p1: { targetIndex: 4 } } },
        'p1',
      ),
    ).toEqual({ aroundTheClockTargetIndex: 4 })
  })

  it('reads Bob 27 target index for the active player', () => {
    expect(
      getGameModePickerTargets(GameModeId.Bob27, { players: { p1: { targetIndex: 2 } } }, 'p1'),
    ).toEqual({ bob27TargetIndex: 2 })
  })

  it('returns empty targets for other modes', () => {
    expect(
      getGameModePickerTargets(GameModeId.X01, { players: { p1: { targetIndex: 1 } } }, 'p1'),
    ).toEqual({})
  })
})

describe('getDartPickerHelpContent', () => {
  it('returns Around the Clock scoring help', () => {
    expect(getDartPickerHelpContent(GameModeId.AroundTheClock).paragraphs[0]).toContain('Miss all')
  })

  it('includes the Bob 27 target label', () => {
    expect(getDartPickerHelpContent(GameModeId.Bob27, 0).paragraphs[0]).toContain('D1')
  })
})
