import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { GameModeId } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import { createGameController, restoreGameController } from './createSession'
import {
  parseActiveGameSnapshot,
  parseEngineState,
  parseGameSession,
  serializeActiveGameSnapshot,
  serializeEngineState,
  serializeGameSession,
} from './serializeGame'
import { createPlayer } from './playerFactory'
import { numberDart } from '../testHelpers'

describe('serializeGame', () => {
  it('round-trips a game session including voided visits', () => {
    const session = createGameController({
      mode: GameModeId.X01,
      players: [createPlayer('One', PlayerKind.Human, 'p1')],
    }).recordDarts([
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
      numberDart(20, DartMultiplier.Single),
    ]).session
    const visit = session.visits[0]
    const withVoided = {
      ...session,
      visits: visit === undefined ? session.visits : [{ ...visit, voided: true }],
    }

    const restored = parseGameSession(serializeGameSession(withVoided))

    expect(restored).toEqual(withVoided)
  })

  it('round-trips engine state and restores a controller from a snapshot', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      players: [
        createPlayer('One', PlayerKind.Human, 'p1'),
        createPlayer('Two', PlayerKind.Human, 'p2'),
      ],
    }).recordDarts([
      numberDart(20, DartMultiplier.Triple),
      numberDart(20, DartMultiplier.Triple),
      numberDart(20, DartMultiplier.Triple),
    ])
    const snapshot = {
      session: controller.session,
      turnIndex: controller.turnIndex,
      pendingDarts: controller.pendingDarts,
      savedAt: '2026-09-07T00:00:00.000Z',
    }

    expect(parseEngineState(serializeEngineState(controller.engineState))).toEqual(
      controller.engineState,
    )

    const restored = restoreGameController(
      parseActiveGameSnapshot(serializeActiveGameSnapshot(snapshot)),
    )

    expect(restored.session).toEqual(controller.session)
    expect(restored.turnIndex).toBe(controller.turnIndex)
    expect(restored.engineState).toEqual(controller.engineState)
  })

  it('rejects invalid session JSON', () => {
    expect(() => parseGameSession('{"id":1}')).toThrow('Invalid game session JSON')
  })
})
