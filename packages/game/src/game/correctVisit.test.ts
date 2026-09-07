import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { GameModeId, GameStatus } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import { createGameController, restoreGameController } from './createSession'
import { CorrectVisitError, correctVisit } from './correctVisit'
import { createPlayer } from './playerFactory'
import { replaySession } from './replaySession'
import { numberDart } from '../testHelpers'

const playerOne = createPlayer('One', PlayerKind.Human, 'p1')
const playerTwo = createPlayer('Two', PlayerKind.Human, 'p2')

const single20 = () => numberDart(20, DartMultiplier.Single)
const double20 = () => numberDart(20, DartMultiplier.Double)
const double10 = () => numberDart(10, DartMultiplier.Double)

const recordVisit = (
  controller: ReturnType<typeof createGameController>,
  darts: ReturnType<typeof numberDart>[],
) => controller.recordDarts(darts)

describe('correctVisit', () => {
  it('replaces a player own visit and recomputes later scores', () => {
    const started = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [playerOne, playerTwo],
    })
    const afterTwoVisits = recordVisit(recordVisit(started, [single20(), single20(), single20()]), [
      single20(),
      single20(),
      single20(),
    ])

    const result = correctVisit(afterTwoVisits.session, playerOne.id, 0, {
      darts: [
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.session.visits[0]?.visitScore).toBe(180)
    expect(result.session.visits[0]?.scoreAfter).toBe(321)
    expect(result.session.visits[1]?.scoreBefore).toBe(501)
    expect(result.session.visits[1]?.darts).toEqual(afterTwoVisits.session.visits[1]?.darts)
  })

  it('rejects correcting an opponent visit', () => {
    const started = createGameController({
      mode: GameModeId.X01,
      players: [playerOne, playerTwo],
    })
    const afterVisit = recordVisit(started, [single20(), single20(), single20()])

    expect(correctVisit(afterVisit.session, playerTwo.id, 0, { darts: [double20()] })).toEqual({
      ok: false,
      error: CorrectVisitError.NotVisitOwner,
    })
  })

  it('rejects a missing visit index', () => {
    const started = createGameController({
      mode: GameModeId.X01,
      players: [playerOne, playerTwo],
    })

    expect(correctVisit(started.session, playerOne.id, 0, { darts: [double20()] })).toEqual({
      ok: false,
      error: CorrectVisitError.VisitNotFound,
    })
  })

  it('voids later visits when a correction ends the game earlier', () => {
    const started = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 80, doubleIn: false, doubleOut: true },
      players: [playerOne, playerTwo],
    })
    const finished = started.recordVisitScore(60).recordVisitScore(60).recordDarts([double10()])

    expect(finished.session.visits).toHaveLength(3)
    expect(finished.isComplete).toBe(true)

    const result = correctVisit(finished.session, playerOne.id, 0, {
      darts: [double20(), double20()],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.session.visits[0]?.checkout).toBe(true)
    expect(result.session.visits[0]?.voided).toBeUndefined()
    expect(result.session.visits[1]?.voided).toBe(true)
    expect(result.session.visits[1]?.playerId).toBe(playerTwo.id)
    expect(result.session.visits[1]?.darts).toEqual(finished.session.visits[1]?.darts)
    expect(result.session.visits[2]?.voided).toBe(true)
    expect(result.session.status).toBe(GameStatus.Completed)
    expect(replaySession(result.session).engineState).toEqual(result.engineState)

    const restored = restoreGameController({
      session: result.session,
      turnIndex: result.turnIndex,
      pendingDarts: [],
      savedAt: '2026-09-07T00:00:00.000Z',
    })
    expect(restored.scoreboard.players[0]?.primaryScore).toBe(0)
    expect(restored.scoreboard.players[1]?.primaryScore).toBe(80)
    expect(restored.isComplete).toBe(true)
  })

  it('un-voids later visits when a game-ending correction is undone', () => {
    const started = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 80, doubleIn: false, doubleOut: true },
      players: [playerOne, playerTwo],
    })
    const finished = started.recordVisitScore(60).recordVisitScore(60).recordDarts([double10()])
    const voided = correctVisit(finished.session, playerOne.id, 0, {
      darts: [double20(), double20()],
    })

    expect(voided.ok).toBe(true)
    if (!voided.ok) {
      return
    }

    const restored = correctVisit(voided.session, playerOne.id, 0, { visitScore: 60 })

    expect(restored.ok).toBe(true)
    if (!restored.ok) {
      return
    }

    expect(restored.session.visits[1]?.voided).toBeUndefined()
    expect(restored.session.visits[2]?.voided).toBeUndefined()
    expect(restored.session.visits[2]?.checkout).toBe(true)
    expect(restored.session.status).toBe(GameStatus.Completed)
  })
})
