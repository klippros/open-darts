import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode'
import { PlayerKind } from '@open-darts/game/types/player'
import { decorateOnlineSessionForViewer, parseOnlinePlaySnapshot } from './onlinePlay'
import { toPublicDartThrow } from './toPublicDartThrow'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'

describe('onlinePlay helpers', () => {
  it('parses play-state envelopes from sessionJson', () => {
    const session = {
      id: 'match-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      players: [
        { id: 'user-a', name: 'Player 1', kind: PlayerKind.Remote },
        { id: 'user-b', name: 'Player 2', kind: PlayerKind.Remote },
      ],
      visits: [],
      status: GameStatus.InProgress,
      startedAt: '2026-01-01T00:00:00.000Z',
    }
    const snapshot = parseOnlinePlaySnapshot(
      JSON.stringify({ session, turnIndex: 1, pendingFinalization: true }),
    )

    expect(snapshot.turnIndex).toBe(1)
    expect(snapshot.pendingFinalization).toBe(true)
    expect(snapshot.session.id).toBe('match-1')
  })

  it('marks the viewer as human and the opponent as remote', () => {
    const decorated = decorateOnlineSessionForViewer(
      {
        id: 'match-1',
        mode: GameModeId.X01,
        config: { startScore: 501, doubleIn: false, doubleOut: true },
        players: [
          { id: 'user-a', name: 'Player 1', kind: PlayerKind.Remote },
          { id: 'user-b', name: 'Player 2', kind: PlayerKind.Remote },
        ],
        visits: [],
        status: GameStatus.InProgress,
        startedAt: '2026-01-01T00:00:00.000Z',
      },
      'user-a',
      'Timon',
    )

    expect(decorated.players[0]).toEqual({
      id: 'user-a',
      name: 'Timon',
      kind: PlayerKind.Human,
    })
    expect(decorated.players[1]).toEqual({
      id: 'user-b',
      name: 'Opponent',
      kind: PlayerKind.Remote,
    })
  })

  it('serializes darts for record_visit payloads', () => {
    expect(
      toPublicDartThrow({
        segment: { type: DartSegmentType.Number, value: 20 },
        multiplier: DartMultiplier.Triple,
        points: 60,
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      segment: { type: 'number', value: 20 },
      multiplier: 'triple',
      points: 60,
      timestamp: '2026-01-01T00:00:00.000Z',
    })
  })
})
