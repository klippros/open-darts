import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import type { Visit } from '../../types/visit'
import { createGameController } from '../game/createSession'
import { createPlayer } from '../game/playerFactory'
import { numberDart } from '../testHelpers'
import { buildVisitEndCallout, createVisitEndCalloutContext } from './buildVisitEndCallout'

describe('buildVisitEndCallout', () => {
  const solo = createPlayer('Solo', PlayerKind.Human, 'solo')
  const human = createPlayer('Smith', PlayerKind.Human, 'human')
  const guest = createPlayer('Jones', PlayerKind.Human, 'guest')

  it('announces scored visits', () => {
    const visit: Visit = {
      visitIndex: 0,
      playerId: solo.id,
      darts: [],
      visitScore: 108,
      scoreBefore: 501,
      scoreAfter: 393,
      bust: false,
      checkout: false,
    }

    expect(
      buildVisitEndCallout(
        visit,
        createGameController({ mode: GameModeId.X01, players: [solo] }).session,
        { isMatchComplete: false, isSessionComplete: false },
      ),
    ).toBe('One hundred eight.')
  })

  it('announces no score for busts without a require follow-up', () => {
    const visit: Visit = {
      visitIndex: 0,
      playerId: solo.id,
      darts: [],
      visitScore: 0,
      scoreBefore: 121,
      scoreAfter: 121,
      bust: true,
      checkout: false,
    }

    expect(
      buildVisitEndCallout(
        visit,
        createGameController({ mode: GameModeId.X01, players: [solo] }).session,
        { isMatchComplete: false, isSessionComplete: false },
      ),
    ).toBe('No score.')
  })

  it('announces game shot once on checkout', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [solo],
    })
    const next = controller.recordDart(numberDart(20, DartMultiplier.Double))
    const [visit] = next.session.visits

    expect(visit).toBeDefined()
    expect(
      buildVisitEndCallout(
        visit,
        next.session,
        createVisitEndCalloutContext(next.session, next.isComplete),
      ),
    ).toBe('Game shot!')
  })

  it('announces game shot and the match when the match is won', () => {
    let controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 40, doubleIn: false, doubleOut: true },
      players: [human, guest],
      matchFormat: { legsToWin: 1, startingPlayerIndex: 0 },
    })

    controller = controller.recordDart(numberDart(20, DartMultiplier.Double))
    const [visit] = controller.session.visits

    expect(visit).toBeDefined()
    expect(
      buildVisitEndCallout(
        visit,
        controller.session,
        createVisitEndCalloutContext(controller.session, controller.isComplete),
      ),
    ).toBe('Game shot! And the match!')
  })

  it('announces game over when a 121 session ends on the last life', () => {
    const failedVisit: Visit = {
      visitIndex: 2,
      playerId: solo.id,
      darts: [],
      visitScore: 60,
      scoreBefore: 121,
      scoreAfter: 120,
      bust: false,
      checkout: false,
      metadata: {
        roundFailed: true,
        livesAfter: 0,
      },
    }

    expect(
      buildVisitEndCallout(
        failedVisit,
        createGameController({
          mode: GameModeId.OneTwentyOne,
          players: [solo],
        }).session,
        { isMatchComplete: false, isSessionComplete: true },
      ),
    ).toBe('Game over.')
  })

  it('does not announce game shot on checkout in 121', () => {
    const controller = createGameController({
      mode: GameModeId.OneTwentyOne,
      players: [solo],
    })
    const next = controller.recordDarts([
      numberDart(20, DartMultiplier.Triple),
      numberDart(17, DartMultiplier.Triple),
      numberDart(5, DartMultiplier.Double),
    ])
    const [visit] = next.session.visits

    expect(visit?.checkout).toBe(true)
    expect(
      buildVisitEndCallout(
        visit!,
        next.session,
        createVisitEndCalloutContext(next.session, next.isComplete),
      ),
    ).toBeNull()
  })
})
