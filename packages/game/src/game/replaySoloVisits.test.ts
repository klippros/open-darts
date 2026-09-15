import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../types/gameMode'
import { PlayerKind } from '../types/player'
import type { Visit } from '../types/visit'
import { VisitInputMode } from '../types/visit'
import { createGameController } from './createSession'
import { replaySoloVisits } from './replaySoloVisits'

const visit = (
  playerId: string,
  visitIndex: number,
  visitScore: number,
  overrides: Partial<Visit> = {},
): Visit => ({
  visitIndex,
  playerId,
  darts: [],
  visitScore,
  scoreBefore: 100 - visitIndex * 20,
  scoreAfter: 80 - visitIndex * 20,
  bust: false,
  checkout: false,
  inputMode: VisitInputMode.VisitScore,
  ...overrides,
})

describe('replaySoloVisits', () => {
  it('replays counting visits from a custom start score', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 100, doubleIn: false, doubleOut: true },
      players: [{ id: 'p1', name: 'Solo', kind: PlayerKind.Human }],
    })

    const replayed = replaySoloVisits(controller, [visit('p1', 0, 20), visit('p1', 1, 20)])

    expect(replayed.session.visits).toHaveLength(2)
    expect(replayed.scoreboard.players[0]?.primaryScore).toBe(60)
    expect(replayed.session.status).toBe(GameStatus.InProgress)
  })

  it('skips voided visits when replaying', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 100, doubleIn: false, doubleOut: true },
      players: [{ id: 'p1', name: 'Solo', kind: PlayerKind.Human }],
    })

    const replayed = replaySoloVisits(controller, [
      visit('p1', 0, 20),
      visit('p1', 1, 180, { voided: true }),
      visit('p1', 2, 20),
    ])

    expect(replayed.session.visits).toHaveLength(2)
    expect(replayed.scoreboard.players[0]?.primaryScore).toBe(60)
  })

  it('replays visit-score visits with empty darts', () => {
    const controller = createGameController({
      mode: GameModeId.X01,
      config: { startScore: 100, doubleIn: false, doubleOut: false },
      players: [{ id: 'p1', name: 'Solo', kind: PlayerKind.Human }],
    })

    const replayed = replaySoloVisits(controller, [
      {
        visitIndex: 0,
        playerId: 'p1',
        darts: [],
        visitScore: 40,
        scoreBefore: 100,
        scoreAfter: 60,
        bust: false,
        checkout: false,
      },
    ])

    expect(replayed.session.visits).toHaveLength(1)
    expect(replayed.scoreboard.players[0]?.primaryScore).toBe(60)
  })
})
