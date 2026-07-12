import { describe, expect, it } from 'vitest'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { createGameController } from '../game/createSession'
import { createPlayer } from '../game/playerFactory'
import { buildVisitStartCallout } from './buildVisitStartCallout'

describe('buildVisitStartCallout', () => {
  const solo = createPlayer('Solo', PlayerKind.Human, 'solo')

  it('returns null when checkout is not possible', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [solo],
    })

    expect(buildVisitStartCallout(controller)).toBeNull()
  })

  it('returns null for bogey checkout scores', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 169, doubleIn: false, doubleOut: true },
      players: [solo],
    })

    expect(buildVisitStartCallout(controller)).toBeNull()

    controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 200, doubleIn: false, doubleOut: true },
      players: [solo],
    })

    expect(buildVisitStartCallout(controller)).toBeNull()
  })

  it('announces you require when checkout is possible', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 120, doubleIn: false, doubleOut: true },
      players: [solo],
    })

    expect(buildVisitStartCallout(controller)).toBe('You require one hundred twenty.')
  })

  it('returns null for modes without checkout rules', () => {
    const controller = createGameController({
      mode: GameModeId.Bob27,
      players: [solo],
    })

    expect(buildVisitStartCallout(controller)).toBeNull()
  })
})
